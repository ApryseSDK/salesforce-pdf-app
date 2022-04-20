import { LightningElement, wire, track, api } from "lwc";
import { CurrentPageReference } from "lightning/navigation";
import { loadScript } from "lightning/platformResourceLoader";
import libUrl from "@salesforce/resourceUrl/lib";
import myfilesUrl from "@salesforce/resourceUrl/myfiles";
import {
  publish,
  createMessageContext,
  releaseMessageContext,
  subscribe,
  unsubscribe,
} from "lightning/messageService";
import WebViewerMC from "@salesforce/messageChannel/WebViewerMessageChannel__c";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import mimeTypes from "./mimeTypes";
import { fireEvent, registerListener, unregisterAllListeners } from "c/pubsub";
import saveDocument from "@salesforce/apex/PDFTron_ContentVersionController.saveDocument";
import saveConvertDocument from "@salesforce/apex/PDFTron_ContentVersionController.convertDocument";
import getUser from "@salesforce/apex/PDFTron_ContentVersionController.getUser";
import getUsers from "@salesforce/apex/PDFTron_ContentVersionController.getUsers";
import getCustomPermission from "@salesforce/apex/PDFTron_ContentVersionController.getCustomPermission";

function _base64ToArrayBuffer(base64) {
  var binary_string = window.atob(base64);
  var len = binary_string.length;
  var bytes = new Uint8Array(len);
  for (var i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

export default class PdftronWvInstance extends LightningElement {
  config = "/config_apex.js";

  @track receivedMessage = "";
  @track channel = null;
  context = createMessageContext();

  source = "My file";
  fullAPI = true;
  enableRedaction = true;
  payload;
  @api recordId;

  username;
  users = [];
  hasPermission;

  @wire(CurrentPageReference)
  pageRef;

  constructor() {
    super();
  }

  connectedCallback() {
    //'/sfc/servlet.shepherd/version/download/0694x000000pEGyAAM'
    ///servlet/servlet.FileDownload?file=documentId0694x000000pEGyAAM
    this.handleSubscribe();
    registerListener("blobSelected", this.handleBlobSelected, this);
    registerListener('transportDocument', this.transportDocument, this);
    registerListener("search", this.search, this);
    registerListener("ribbon", this.handleRibbon, this);
    registerListener("video", this.loadVideo, this);
    registerListener("replace", this.contentReplace, this);
    registerListener("redact", this.contentRedact, this);
    registerListener("redactPhone", this.contentRedactPhone, this);
    registerListener("redactDTM", this.contentRedactDTM, this);
    registerListener("redactEmail", this.contentRedactEmail, this);
    registerListener('clearSelected', this.handleClearSelected, this);
    registerListener('doc_gen_mapping', this.handleTemplateMapping, this);
    window.addEventListener('unload', this.unloadHandler,this);
    window.addEventListener("message", this.handleReceiveMessage);
  }

  disconnectedCallback() {
    unregisterAllListeners(this);
    window.removeEventListener("message", this.handleReceiveMessage);
    this.handleUnsubscribe();
  }

  handleSubscribe() {
    if (this.channel) {
      return;
    }
    this.channel = subscribe(this.context, WebViewerMC, (message) => {
    });
  }

  handleUnsubscribe() {
    releaseMessageContext(this.context);
    unsubscribe(this.channel);
  }

  handleRibbon(ribbon) {
    this.iframeWindow.postMessage(
      { type: "RIBBON_CHANGE", ribbon },
      window.origin
    );
  }

  contentReplace(payload) {
    const origin = window.origin + "/" + this.recordId;
    this.iframeWindow.postMessage(
      { type: "REPLACE_CONTENT", payload, origin: origin },
      window.origin
    );
  }

  contentRedact() {
    this.iframeWindow.postMessage({ type: "REDACT_CONTENT" }, "*");
  }

  contentRedactPhone() {
    this.iframeWindow.postMessage({ type: "REDACT_CONTENT_PHONE" }, "*");
  }

  contentRedactDTM() {
    this.iframeWindow.postMessage({ type: "REDACT_CONTENT_DTM" }, "*");
  }

  contentRedactEmail() {
    this.iframeWindow.postMessage({ type: "REDACT_CONTENT_EMAIL" }, "*");
  }

  loadVideo(url) {
    this.iframeWindow.postMessage({ type: "LOAD_VIDEO", url }, "*");
  }

  search(term) {
    this.iframeWindow.postMessage({ type: "SEARCH_DOCUMENT", term }, "*");
  }

  handleBlobSelected(record) {
    var blobby = new Blob([_base64ToArrayBuffer(record.body)], {
      type: mimeTypes[record.FileExtension],
    });

    const payload = {
      blob: blobby,
      extension: record.cv.FileExtension,
      file: record.cv.Title,
      filename: record.cv.Title + "." + record.cv.FileExtension,
      documentId: record.cv.Id,
    };

    this.payload = {...payload};

    switch (payload.extension){
      case 'tiff':
        this.iframeWindow.postMessage({ type: 'OPEN_TIFF_BLOB', payload }, '*');
        break;
      default:
        this.iframeWindow.postMessage({ type: 'OPEN_DOCUMENT_BLOB', payload }, '*');
        break;
    }
  }

  renderedCallback() {
    var self = this;
    if (this.uiInitialized) {
      return;
    }
    this.uiInitialized = true;

    Promise.all([
      loadScript(self, libUrl + "/webviewer.min.js")
    ])
      .then(() => this.handleCustomPermission())
      .then(() => this.handleMentions())
      .then(() => this.handleInitWithCurrentUser())
      .catch(console.error);
  }

  handleCustomPermission() {
    getCustomPermission({ permission: 'YOUR_CUSTOM_PERMISSION'})
    .then((result) => {
      this.hasPermission = result;
    })
    .catch((error) => {
      console.error(error);
      this.showNotification("Error", error.body.message, "error");
    });
  }

  handleMentions() {
    getUsers()
      .then((result) => {
        result.forEach((user) => {
          let current = {
            value: user.FirstName + " " + user.LastName,
            email: user.Email,
          };

          this.users = [...this.users, current];
        });
      })
      .catch((error) => {
        console.error(error);
        this.showNotification("Error", error.body.message, "error");
      });
  }

  handleInitWithCurrentUser() {
    getUser()
      .then((result) => {
        this.username = result;
        this.error = undefined;

        this.initUI();
      })
      .catch((error) => {
        console.error(error);
        this.showNotification("Error", error.body.message, "error");
      });
  }

  handleTemplateMapping(mapping) {
    console.log('mapping in instance: ', mapping);
    this.iframeWindow.postMessage({ type: 'FILL_TEMPLATE', mapping }, '*');
  }


  initUI() {
    var myObj = {
      libUrl: libUrl,
      fullAPI: this.fullAPI || false,
      namespacePrefix: "",
      username: this.username,
      userlist: JSON.stringify(this.users),
      hasPermission: this.hasPermission
    };
    var url = myfilesUrl + "/webviewer-demo-annotated.pdf";

    const viewerElement = this.template.querySelector("div");
    // eslint-disable-next-line no-unused-vars
    const viewer = new WebViewer(
      {
        path: libUrl, // path to the PDFTron 'lib' folder on your server
        custom: JSON.stringify(myObj),
        backendType: "ems",
        initialDoc: url,
        config: myfilesUrl + this.config,
        fullAPI: this.fullAPI,
        enableFilePicker: this.enableFilePicker,
        enableRedaction: this.enableRedaction,
        enableMeasurement: this.enableMeasurement,
        // l: 'YOUR_LICENSE_KEY_HERE',
        
      },
      viewerElement
    );

    viewerElement.addEventListener("ready", () => {
      this.iframeWindow = viewerElement.querySelector("iframe").contentWindow;
    });
  }

  transportDocument(convert) {
    if(this.payload != null){

      const payload = {...this.payload};
      payload.exportType = convert.value;
      payload.transport = convert.transport;
      this.iframeWindow.postMessage({type: convert.transport, payload }, '*');

    } else {
      console.log('No file selected');
    }
  }

  handleClearSelected() {
    this.iframeWindow.postMessage({type: 'CLOSE_DOCUMENT' }, '*')
  }

  showNotification (title, message, variant) {
    const evt = new ShowToastEvent({
      title: title,
      message: message,
      variant: variant
    })
    this.dispatchEvent(evt)
  }

  handleReceiveMessage = (event) => {
    const me = this;
    if (event.isTrusted && typeof event.data === "object") {
      switch (event.data.type) {
        case "SAVE_DOCUMENT":
          saveDocument({
            json: JSON.stringify(event.data.payload),
            recordId: this.recordId,
          })
            .then((response) => {
              me.iframeWindow.postMessage(
                { type: "DOCUMENT_SAVED", response },
                "*"
              );
            })
            .catch((error) => {
              console.error(JSON.stringify(error));
            });
          break;
        case "SAVE_CONVERT_DOCUMENT":
          const cvId = event.data.payload.contentDocumentId;
          saveConvertDocument({ json: JSON.stringify(event.data.payload), recordId: this.recordId ? this.recordId : '', cvId: cvId })
          .then((response) => {
            me.iframeWindow.postMessage({ type: 'DOCUMENT_SAVED', response }, '*');
            fireEvent(this.pageRef, 'finishConvert', '');
            fireEvent(this.pageRef, 'refreshOnSave', response);
            this.showNotification('Success', event.data.payload.filename + ' Saved', 'success');
          })
          .catch(error => {
            me.iframeWindow.postMessage({ type: 'DOCUMENT_SAVED', error }, '*');
            fireEvent(this.pageRef, 'refreshOnSave', error);
            console.error(event.data.payload.contentDocumentId);
            console.error(JSON.stringify(error));
            this.showNotification('Error', error.body, 'error');
          });
          break;
        case "DOC_KEYS":
          let keys = JSON.parse(JSON.stringify(event.data.keys));
          console.log("keys", keys);

          console.log("firing doc_gen_options");
          fireEvent(this.pageRef, 'doc_gen_options', keys);
        case 'DOWNLOAD_CONVERT_DOCUMENT':
          me.iframeWindow.postMessage({ type: 'DOCUMENT_DOWNLOADED' }, '*');
          const body = event.data.file + ' Downloaded';
          fireEvent(this.pageRef, 'finishConvert', '');
          this.showNotification('Success', body, 'success');\
          break;
        default:
          break;
      }
    }
  }
}