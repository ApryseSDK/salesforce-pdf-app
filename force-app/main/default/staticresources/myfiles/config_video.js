var resourceURL = '/resource/'
window.Core.forceBackendType('ems');

var urlSearch = new URLSearchParams(location.hash)
var custom = JSON.parse(urlSearch.get('custom'));
resourceURL = resourceURL + custom.namespacePrefix;

// var script = document.createElement('script');
// script.type = 'text/javascript';
// script.src = custom.path + '/video.js';
// document.head.appendChild(script);

var videoMain = document.createElement('script');
videoMain.type = 'text/javascript';
videoMain.src = custom.path + '/main-with-react.js';
document.head.appendChild(videoMain);

var onLoadPromise = new Promise(function (resolve) {
  videoMain.onload = function () {
    resolve();
  }
});

/**
 * The following `window.Core.set*` functions point WebViewer to the
 * optimized source code specific for the Salesforce platform, to ensure the
 * uploaded files stay under the 5mb limit
 */

// office workers
window.Core.setOfficeWorkerPath(resourceURL + 'office')
window.Core.setOfficeAsmPath(resourceURL + 'office_asm');
window.Core.setOfficeResourcePath(resourceURL + 'office_resource');

// pdf workers
window.Core.setPDFResourcePath(resourceURL + 'resource')
if (custom.fullAPI) {
  window.Core.setPDFWorkerPath(resourceURL + 'pdf_full')
  window.Core.setPDFAsmPath(resourceURL + 'asm_full');
} else {
  window.Core.setPDFWorkerPath(resourceURL + 'pdf_lean')
  window.Core.setPDFAsmPath(resourceURL + 'asm_lean');
}

// external 3rd party libraries
window.Core.setExternalPath(resourceURL + 'external')



window.addEventListener('viewerLoaded', async function () {

  // When the viewer has loaded, this makes the necessary call to get the
  // pdftronWvInstance code to pass User Record information to this config file
  // to invoke annotManager.setCurrentUser
  instance.Core.documentViewer.getAnnotationManager().setCurrentUser(custom.username);

  const annotationManager = await instance.Core.documentViewer.getAnnotationManager();

  onLoadPromise
    .then(function () {
      var customContainer = window.document.querySelector('.custom-container');

      instance.UI.openElements('notesPanel');
      instance.UI.setTheme('dark');

      instance.iframeWindow = window;

      console.log(instance);
      console.log(instance.iframeWindow);

      window.WebViewerVideo.initializeVideoViewer(instance)
        .then(({ loadVideo }) => {
          const videoUrl = 'https://pdftron.s3.amazonaws.com/downloads/pl/video/video.mp4';
          loadVideo(videoUrl);

          // instance.docViewer.on('documentLoaded', () => {
          //   window.WebViewerVideo.renderControlsToDOM(instance, customContainer);
          // });
        });
    });
});

window.addEventListener("message", receiveMessage, false);

function receiveMessage(event) {
  if (event.isTrusted && typeof event.data === 'object') {
    switch (event.data.type) {
      case 'OPEN_DOCUMENT':
        instance.UI.loadDocument(event.data.file)
        break;
      case 'OPEN_DOCUMENT_BLOB':
        const { blob, extension, filename, documentId } = event.data.payload;
        console.log("documentId", documentId);
        currentDocId = documentId;
        instance.UI.loadDocument(blob, { extension, filename, documentId })
        break;
      case 'DOCUMENT_SAVED':
        console.log(`${JSON.stringify(event.data)}`);
        instance.showErrorMessage('Document saved ')
        setTimeout(() => {
          instance.closeElements(['errorModal', 'loadingModal'])
        }, 2000)
        break;
      case 'LMS_RECEIVED':  
        instance.loadDocument(event.data.payload.message, {
          filename: event.data.payload.filename,
          withCredentials: false
        });
        break;
      case 'DOWNLOAD_DOCUMENT':
        downloadWebViewerFile();
        break;
      case 'CLOSE_DOCUMENT':
        instance.closeDocument()
        break;
      default:
        break;
    }
  }
}
