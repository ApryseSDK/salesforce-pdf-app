var resourceURL = '/resource/'
window.CoreControls.forceBackendType('ems');

var urlSearch = new URLSearchParams(location.hash)
var custom = JSON.parse(urlSearch.get('custom'));
resourceURL = resourceURL + custom.namespacePrefix;

/**
 * The following `window.CoreControls.set*` functions point WebViewer to the
 * optimized source code specific for the Salesforce platform, to ensure the
 * uploaded files stay under the 5mb limit
 */
// office workers
window.CoreControls.setOfficeWorkerPath(resourceURL + 'office')
window.CoreControls.setOfficeAsmPath(resourceURL + 'office_asm');
window.CoreControls.setOfficeResourcePath(resourceURL + 'office_resource');

// pdf workers
window.CoreControls.setPDFResourcePath(resourceURL + 'resource')
if (custom.fullAPI) {
  window.CoreControls.setPDFWorkerPath(resourceURL + 'pdf_full')
  window.CoreControls.setPDFAsmPath(resourceURL + 'asm_full');
} else {
  window.CoreControls.setPDFWorkerPath(resourceURL + 'pdf_lean')
  window.CoreControls.setPDFAsmPath(resourceURL + 'asm_lean');
}

// external 3rd party libraries
window.CoreControls.setExternalPath(resourceURL + 'external')
window.CoreControls.setCustomFontURL('https://pdftron.s3.amazonaws.com/custom/ID-zJWLuhTffd3c/vlocity/webfontsv20/');

async function saveDocument() {
  const doc = docViewer.getDocument();
  if (!doc) {
    return;
  }
  readerControl.openElement('loadingModal');

  const fileType = doc.getType();
  const filename = doc.getFilename();
  const xfdfString = await docViewer.getAnnotationManager().exportAnnotations();
  const data = await doc.getFileData({
    // Saves the document with annotations in it
    xfdfString
  });

  let binary = '';
  const bytes = new Uint8Array(data);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  const base64Data = window.btoa(binary);

  const payload = {
    title: filename.replace(/\.[^/.]+$/, ""),
    filename,
    base64Data,
    contentDocumentId: doc.__contentDocumentId
  }
  // Post message to LWC
  parent.postMessage({ type: 'SAVE_DOCUMENT', payload }, '*');
}

async function addSaveButton() {
  /**
   * On keydown of either the button combination Ctrl+S or Cmd+S, invoke the
   * saveDocument function
   */
  readerControl.hotkeys.on('ctrl+s, command+s', e => {
    e.preventDefault();
    saveDocument();
  });

  // Create a button, with a disk icon, to invoke the saveDocument function
  readerControl.setHeaderItems(function (header) {
    var myCustomButton = {
      type: 'actionButton',
      dataElement: 'saveDocumentButton',
      title: 'tool.SaveDocument',
      img: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>',
      onClick: function () {
        saveDocument();
      }
    }
    header.get('viewControlsButton').insertBefore(myCustomButton);
  });
}

async function replaceContent(searchString, replacementString) {
  const docViewer = readerControl.docViewer;
  const doc = readerControl.docViewer.getDocument();//get current document from WV
  if (!doc) {
    return;
  }
  const PDFdoc = await doc.getPDFDoc(); //pass WV Doc to PDFNet
  await PDFNet.initialize();

  PDFdoc.initSecurityHandler();
  PDFdoc.lock();

  // Run PDFNet methods with memory management
  await PDFNet.runWithCleanup(async () => {
    // lock the document before a write operation
    // runWithCleanup will auto unlock when complete
    const replacer = await PDFNet.ContentReplacer.create();
    await replacer.setMatchStrings(searchString.charAt(0), searchString.slice(-1));
    await replacer.addString(searchString.slice(1, -1), replacementString);
    for (var i = 1; i <= docViewer.getPageCount(); ++i) {
      const page = await PDFdoc.getPage(i);
      await replacer.process(page);
    }
  });

  docViewer.refreshAll();
  docViewer.updateView();
  docViewer.getDocument().refreshTextData();
}

window.addEventListener('viewerLoaded', async function () {
  addSaveButton();
});

window.addEventListener("documentLoaded", () => {
});

window.addEventListener("message", receiveMessage, false);

function receiveMessage(event) {
  if (event.isTrusted && typeof event.data === 'object') {
    switch (event.data.type) {
      case 'OPEN_DOCUMENT':
        event.target.readerControl.loadDocument(event.data.file)
        break;
      case 'OPEN_DOCUMENT_BLOB':
        const { blob, extension, filename, documentId } = event.data.payload;
        event.target.readerControl.loadDocument(blob, { extension, filename, documentId })
        break;
      case 'DOCUMENT_SAVED':
        readerControl.showErrorMessage('Document saved!')
        setTimeout(() => {
          readerControl.closeElements(['errorModal', 'loadingModal'])
        }, 2500)
        break;
      case 'SEARCH_DOCUMENT':
        if (event.data.term) {
          readerControl.showErrorMessage(`Searching for ${event.data.term}`);

          const searchOptions = {
            caseSensitive: true,  // match case
            wholeWord: true,      // match whole words only
            wildcard: false,      // allow using '*' as a wildcard value
            regex: false,         // string is treated as a regular expression
            searchUp: false,      // search from the end of the document upwards
            ambientString: true,  // return ambient string as part of the result
          };
          readerControl.searchTextFull(event.data.term, searchOptions);
          readerControl.closeElements(['errorModal', 'loadingModal'])
        }
        break;
      case 'REPLACE_CONTENT':
        const { searchString, replacementString } = event.data.payload;
        replaceContent(searchString, replacementString);
        break;
      case 'LMS_RECEIVED':
        readerControl.showErrorMessage('Link received: ' + event.data.message);
        setTimeout(() => {
          readerControl.closeElements(['errorModal', 'loadingModal'])
        }, 2000)
        break;
      case 'CLOSE_DOCUMENT':
        event.target.readerControl.closeDocument()
        break;
      default:
        break;
    }
  }
}
