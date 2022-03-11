import { LightningElement, track, wire, api } from "lwc";
import { CurrentPageReference } from "lightning/navigation";
import { fireEvent } from "c/pubsub";
import getAttachments from "@salesforce/apex/PDFTron_ContentVersionController.getAttachments";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import {
  publish,
  createMessageContext,
  releaseMessageContext,
  subscribe,
  unsubscribe,
} from "lightning/messageService";
import WebViewerMC from "@salesforce/messageChannel/WebViewerMessageChannel__c";
import { NavigationMixin } from "lightning/navigation";

export default class PdftronContentReplacer extends NavigationMixin(
  LightningElement
) {
  //file upload
  MAX_FILE_SIZE = 5;
  uploadedFiles;
  fileName;
  file;

  //LMS
  @track receivedMessage = "";
  channel;
  context = createMessageContext();

  //UI
  error;

  //conditional rendering
  @track filePicker = false;
  @track renderSearch = false;
  @track renderReplace = false;
  @track renderRedact = false;
  @track renderVideo = false;
  @track renderConvert = false;
  @track renderDocumentTemplate = false;

  @track title = "View Documents";
  @track value = "";
  @track searchTerm = "[Company Name]";
  @track replaceTerm = "PDFTron Systems Inc.";
  @track videoURL =
    "https://pdftron.s3.amazonaws.com/downloads/pl/video/video.mp4";
  @track picklistOptions = [];
  @track isSaving = false;
  @track loadFinished = false;
  @track docTemplate;

  //context
  @api recordId;
  @wire(CurrentPageReference) pageRef;

  connectedCallback() {
    this.handleSubscribe();

    this.loadFinished = true;
  }

  disconnectedCallback() {
    this.handleUnsubscribe();
  }

  showNotification(title, message, variant) {
    const evt = new ShowToastEvent({
      title: title,
      message: message,
      variant: variant,
    });
    this.dispatchEvent(evt);
  }

  handleSelected(event){
    this.docTemplate = JSON.parse(JSON.stringify(event.detail));
  }
  //search by enter key
  handleKeyUp(evt) {
    const isEnterKey = evt.keyCode === 13;
    if (isEnterKey) {
      this.search(evt.target.value);
    }
  }

  handleSearch(event) {
    // Debouncing this method: Do not actually fire the event as long as this function is
    // being called within a delay of 500ms. This is to avoid a very large number of Apex
    // method calls in components listening to this event.
    window.clearTimeout(this.delayTimeout);

    //auto search after 500 ms
    this.delayTimeout = setTimeout(() => {
      this.searchTerm = event.detail.value;
      this.search(event.detail.value);
    }, 500);
  }

  handleReplace(event) {
    window.clearTimeout(this.delayTimeout);

    this.delayTimeout = setTimeout(() => {
      this.replaceTerm = event.detail.value;
    }, 350);
  }

  handleContentRedact() {
    this.loadFinished = false;
    fireEvent(this.pageRef, "redact", {});
    this.loadFinished = true;
  }

  handleContentRedactPhone() {
    this.loadFinished = false;
    fireEvent(this.pageRef, "redactPhone", {});
    this.loadFinished = true;
  }

  handleContentRedactDTM() {
    this.loadFinished = false;
    fireEvent(this.pageRef, "redactDTM", {});
    this.loadFinished = true;
  }

  handleContentRedactEmail() {
    this.loadFinished = false;
    fireEvent(this.pageRef, "redactEmail", {});
    this.loadFinished = true;
  }

  handleContentReplace() {
    console.log(this.replaceTerm);

    //validate
    this.template.querySelectorAll("lightning-input").forEach((element) => {
      //element.reportValidity();
    });

    if (this.replaceTerm) {
      this.loadFinished = false;
      const payload = {
        searchString: this.searchTerm,
        replacementString: this.replaceTerm,
      };
      fireEvent(this.pageRef, "replace", payload);
      this.loadFinished = true;
    } else {
      this.error = "You need to include a replace text value.";
    }
  }

  handleContentConvert() {
    this.loadFinished = false;
    fireEvent(this.pageRef, "convert", {});
    this.loadFinished = true;
  }

  handleSubscribe() {
    if (this.channel) {
      return;
    }
    this.channel = subscribe(this.context, WebViewerMC, (message) => {
      if (message) {
        console.log(message);
        this.title = message.messageBody;
        fireEvent(this.pageRef, "ribbon", this.title);

        switch (this.title) {
          case "Search Text":
            this.filePicker = true;
            this.renderSearch = true;
            this.renderRedact = false;
            this.renderReplace = false;
            this.renderVideo = false;
            this.renderConvert = false;
            this.renderDocumentTemplate = false;
            break;
          case "Open Documents":
            this.filePicker = true;
            this.renderSearch = false;
            this.renderRedact = false;
            this.renderReplace = false;
            this.renderVideo = false;
            this.renderConvert = false;
            this.renderDocumentTemplate = false;
            break;
          case "Annotate Documents":
            this.filePicker = true;
            this.renderSearch = false;
            this.renderRedact = false;
            this.renderReplace = false;
            this.renderVideo = false;
            this.renderConvert = false;
            this.renderDocumentTemplate = false;
            break;
          case "Save Documents":
            this.filePicker = true;
            this.renderSearch = false;
            this.renderRedact = false;
            this.renderReplace = false;
            this.renderVideo = false;
            this.renderConvert = false;
            this.renderDocumentTemplate = false;
            break;
          case "Replace Content":
            this.filePicker = true;
            this.renderSearch = true;
            this.renderRedact = false;
            this.renderReplace = true;
            this.renderVideo = false;
            this.renderConvert = false;
            this.renderDocumentTemplate = false;
            break;
          case "Redact Content":
            this.filePicker = true;
            this.renderSearch = true;
            this.renderRedact = true;
            this.renderReplace = false;
            this.renderVideo = false;
            this.renderConvert = false;
            this.renderDocumentTemplate = false;
            break;
          case "Sign Documents":
            this.filePicker = true;
            this.renderSearch = false;
            this.renderRedact = false;
            this.renderReplace = false;
            this.renderVideo = false;
            this.renderConvert = false;
            this.renderDocumentTemplate = false;
            break;
          case "Edit Page(s)":
            this.filePicker = true;
            this.renderSearch = false;
            this.renderRedact = false;
            this.renderReplace = false;
            this.renderVideo = false;
            this.renderConvert = false;
            this.renderDocumentTemplate = false;
            break;
          case "Form Fields":
            this.filePicker = true;
            this.renderSearch = false;
            this.renderRedact = false;
            this.renderReplace = false;
            this.renderVideo = false;
            this.renderConvert = false;
            this.renderDocumentTemplate = false;
            break;
          case "Crop Documents":
            this.filePicker = true;
            this.renderSearch = false;
            this.renderRedact = false;
            this.renderReplace = false;
            this.renderVideo = false;
            this.renderConvert = false;
            this.renderDocumentTemplate = false;
            break;
          case "Collaborate - Comments, Mentions, Approvals":
            this.filePicker = true;
            this.renderSearch = false;
            this.renderRedact = false;
            this.renderReplace = false;
            this.renderVideo = false;
            this.renderConvert = false;
            this.renderDocumentTemplate = false;
            break;
          case "Measure Distances":
            this.filePicker = true;
            this.renderSearch = false;
            this.renderRedact = false;
            this.renderReplace = false;
            this.renderVideo = false;
            this.renderConvert = false;
            this.renderDocumentTemplate = false;
            break;
          case "Video":
            this.filePicker = false;
            this.renderSearch = false;
            this.renderRedact = false;
            this.renderReplace = false;
            this.renderVideo = true;
            this.renderConvert = false;
            this.renderDocumentTemplate = false;
            break;
          case "Convert Documents":
            this.filePicker = true;
            this.renderSearch = false;
            this.renderRedact = false;
            this.renderReplace = false;
            this.renderVideo = false;
            this.renderConvert = true;
            this.renderDocumentTemplate = false;
            break;
          case "Template Documents":
            this.filePicker = true;
            this.renderSearch = false;
            this.renderRedact = false;
            this.renderReplace = false;
            this.renderVideo = false;
            this.renderConvert = false;
            this.renderDocumentTemplate = true;
            break;
          default:
            this.filePicker = false;
            this.renderSearch = false;
            this.renderRedact = false;
            this.renderReplace = false;
            this.renderVideo = false;
            this.renderConvert = false;
            this.renderDocumentTemplate = false;
            break;
        }
      }
    });
  }


  handleUnsubscribe() {
    releaseMessageContext(this.context);
    unsubscribe(this.channel);
  }

  handleVideoURL(event) {
    console.log(`New vid URL: ${event.detail.value}`);
    this.videoURL = event.detail.value;
    fireEvent(this.pageRef, "video", this.videoURL);
  }

  search(searchTerm) {
    this.loadFinished = false;
    fireEvent(this.pageRef, "search", searchTerm);
    this.loadFinished = true;
  }
}