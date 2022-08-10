import { LightningElement, wire, track, api } from "lwc";
import { CurrentPageReference } from "lightning/navigation";
import { loadScript } from "lightning/platformResourceLoader";
import libUrl from "@salesforce/resourceUrl/V87lib";
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
import { fireEvent, registerListener, unregisterAllListeners } from "c/pubsub";
import saveDocument from "@salesforce/apex/PDFTron_ContentVersionController.saveDocument";
import getUser from "@salesforce/apex/PDFTron_ContentVersionController.getUser";
import getResourceURL from "@salesforce/apex/PDFTron_ContentVersionController.getResourceURL";



export default class PdftronWvVideoInstance extends LightningElement {
  config = "/config_video.js";

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

  

  connectedCallback() {
    //'/sfc/servlet.shepherd/version/download/0694x000000pEGyAAM'
    ///servlet/servlet.FileDownload?file=documentId0694x000000pEGyAAM
    this.handleSubscribe();
    registerListener("blobSelected", this.handleBlobSelected, this);
    registerListener("transportDocument", this.transportDocument, this);
    registerListener("search", this.search, this);
    registerListener("ribbon", this.handleRibbon, this);
    registerListener("video", this.loadVideo, this);
    registerListener("clearSelected", this.handleClearSelected, this);
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
    this.channel = subscribe(this.context, WebViewerMC, (message) => {});
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

  

  loadVideo(url) {
    this.iframeWindow.postMessage({ type: "LOAD_VIDEO", url }, "*");
  }

  

  renderedCallback() {
    var self = this;
    if (this.uiInitialized) {
      return;
    }
    this.uiInitialized = true;

    Promise.all([loadScript(self, libUrl + "/webviewer.min.js")])
      .then(() => this.handleInitWithCurrentUser())
      .catch(console.error);
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

  async initUI() {
    let path = await getResourceURL({resourceName: 'myfiles'});
    var myObj = {
      libUrl: libUrl,
      fullAPI: this.fullAPI || false,
      namespacePrefix: "",
      username: this.username,
      userlist: JSON.stringify(this.users),
      hasPermission: this.hasPermission,
      path: path
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
        css: myfilesUrl + "/styles.css",
        fullAPI: this.fullAPI,
        enableFilePicker: this.enableFilePicker,
        enableRedaction: this.enableRedaction,
        enableMeasurement: this.enableMeasurement,
        enableOptimizedWorkers: false
        // l: 'YOUR_LICENSE_KEY_HERE',
      },
      viewerElement
    );

    viewerElement.addEventListener("ready", () => {
      this.iframeWindow = viewerElement.querySelector("iframe").contentWindow;
    });
  }

  

  handleClearSelected() {
    this.iframeWindow.postMessage({ type: "CLOSE_DOCUMENT" }, "*");
  }

  showNotification(title, message, variant) {
    const evt = new ShowToastEvent({
      title: title,
      message: message,
      variant: variant,
    });
    this.dispatchEvent(evt);
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
        
        
        default:
          break;
      }
    }
  };
}
