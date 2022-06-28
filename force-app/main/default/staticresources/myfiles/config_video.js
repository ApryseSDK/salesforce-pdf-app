var resourceURL = "/resource/";
window.CoreControls.forceBackendType("ems");

var urlSearch = new URLSearchParams(location.hash);
var custom = JSON.parse(urlSearch.get("custom"));
resourceURL = resourceURL + custom.namespacePrefix;

var script = document.createElement("script");
script.type = "text/javascript";

// @TODO
// update '/1614618671000/' timestamp to work with your org
// use relative path to your main.js file hosted in your static resources
let timestamp = Date.now() + "";
script.src = `/resource/1653592972000/myfiles/main_video.js`;


document.head.appendChild(script);

var onLoadPromise = new Promise(function (resolve) {
  script.onload = function () {
    resolve();
  };
});

/**
 * The following `window.CoreControls.set*` functions point WebViewer to the
 * optimized source code specific for the Salesforce platform, to ensure the
 * uploaded files stay under the 5mb limit
 */
// office workers
window.CoreControls.setOfficeWorkerPath(resourceURL + "office");
window.CoreControls.setOfficeAsmPath(resourceURL + "office_asm");
window.CoreControls.setOfficeResourcePath(resourceURL + "office_resource");

// pdf workers
window.CoreControls.setPDFResourcePath(resourceURL + "resource");
if (custom.fullAPI) {
  window.CoreControls.setPDFWorkerPath(resourceURL + "pdf_full");
  window.CoreControls.setPDFAsmPath(resourceURL + "asm_full");
} else {
  window.CoreControls.setPDFWorkerPath(resourceURL + "pdf_lean");
  window.CoreControls.setPDFAsmPath(resourceURL + "asm_lean");
}

// external 3rd party libraries
window.CoreControls.setExternalPath(resourceURL + "external");
window.CoreControls.setCustomFontURL(
  "https://pdftron.s3.amazonaws.com/custom/ID-zJWLuhTffd3c/vlocity/webfontsv20/"
);

async function saveDocument() {
  const doc = docViewer.getDocument();
  if (!doc) {
    return;
  }
  instance.openElement("loadingModal");

  const fileType = doc.getType();
  const filename = doc.getFilename();
  const xfdfString = await docViewer.getAnnotationManager().exportAnnotations();
  const data = await doc.getFileData({
    // Saves the document with annotations in it
    xfdfString,
  });

  let binary = "";
  const bytes = new Uint8Array(data);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  const base64Data = window.btoa(binary);

  const payload = {
    title: filename.replace(/\.[^/.]+$/, ""),
    filename,
    base64Data,
    contentDocumentId: doc.__contentDocumentId,
  };
  // Post message to LWC
  parent.postMessage({ type: "SAVE_DOCUMENT", payload }, "*");
}

window.addEventListener("viewerLoaded", async function () {
  onLoadPromise.then(function () {
    instance.iframeWindow = window;
    var customContainer = window.document.querySelector(".custom-container");
    instance.CoreControls = CoreControls;
    instance.Annotations = Annotations;
    instance.Tools = Tools;

    instance.openElements("notesPanel");
    instance.setTheme("dark");
    window.WebViewerVideo.initializeVideoViewer(
      instance,
      "LICENSE_KEY_HERE"
    ).then(({ loadVideo }) => {
      const videoUrl =
        "https://pdftron.s3.amazonaws.com/downloads/pl/video/video.mp4";
      loadVideo(videoUrl);

      instance.docViewer.on("documentLoaded", () => {
        window.WebViewerVideo.renderControlsToDOM(instance, customContainer);
      });
    });
  });
});

window.addEventListener("message", receiveMessage, false);

async function receiveMessage(event) {
  if (event.isTrusted && typeof event.data === "object") {
    switch (event.data.type) {
      case "LOAD_VIDEO":
        console.log(event.data);
        console.log(event.data.url);

        loadVid(event.data.url);

        break;
      default:
        break;
    }
  }
}
