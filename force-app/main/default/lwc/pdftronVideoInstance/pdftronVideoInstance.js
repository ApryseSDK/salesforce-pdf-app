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
import { registerListener, unregisterAllListeners } from "c/pubsub";
import saveDocument from "@salesforce/apex/PDFTron_ContentVersionController.saveDocument";

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
  @track receivedMessage = "";
  channel;
  context = createMessageContext();

  source = "My file";
  fullAPI = true;
  enableRedaction = true;
  @api recordId;

  @wire(CurrentPageReference)
  pageRef;

  constructor() {
    super();
  }

  connectedCallback() {
    this.handleSubscribe();
    registerListener("video", this.loadVideo, this);
  }

  disconnectedCallback() {
    unregisterAllListeners(this);
    window.removeEventListener("message", this.handleReceiveMessage, true);
    this.handleUnsubscribe();
  }

  handleSubscribe() {
    if (this.channel) {
      return;
    }
    this.channel = subscribe(this.context, WebViewerMC, (message) => {
      if (message) {
        console.log(message);
      }
    });
  }

  handleUnsubscribe() {
    releaseMessageContext(this.context);
    unsubscribe(this.channel);
  }

  loadVideo(url) {
    console.log(`Sending ${url} to iFrame`);
    this.iframeWindow.postMessage({ type: "LOAD_VIDEO", url }, "*");
  }

  renderedCallback() {
    var self = this;
    if (this.uiInitialized) {
      return;
    }
    this.uiInitialized = true;

    Promise.all([loadScript(self, libUrl + "/webviewer.min.js")])
      .then(() => this.initUI())
      .catch(console.error);
  }

  initUI() {
    var myObj = {
      libUrl: libUrl,
      fullAPI: this.fullAPI || false,
      namespacePrefix: "",
    };
    var url = myfilesUrl + "/webviewer-demo-annotated.pdf";

    const viewerElement = this.template.querySelector("div");
    // eslint-disable-next-line no-unused-vars
    const viewer = new PDFTron.WebViewer(
      {
        path: libUrl, // path to the PDFTron 'lib' folder on your server
        custom: JSON.stringify(myObj),
        backendType: "ems",
        config: myfilesUrl + "/config_video.js",
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
}
