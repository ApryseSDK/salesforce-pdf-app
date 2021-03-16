import { LightningElement, track, wire, api } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { fireEvent } from 'c/pubsub';
import getAttachments from "@salesforce/apex/PDFTron_ContentVersionController.getAttachments";
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import pdftronlogo from '@salesforce/resourceUrl/PDFTron_Logo';

export default class PdftronContentReplacer extends LightningElement {

    error;
    pdftronLogo = pdftronlogo;

    //UI
    @track value = '';
    @track searchTerm = '[Company Name]';
    @track replaceTerm = 'PDFTron Systems Inc.';
    @track picklistOptions = [];
    @track isSaving = false;
    @track loadFinished = false;

    //context
    @api recordId;
    @wire(CurrentPageReference) pageRef;

    
    @wire(getAttachments, { recordId: "$recordId" })
    attachments({ error, data }) {
        if (data) {
            data.forEach((attachmentRecord) => {
                var name = attachmentRecord.cv.Title + "." + attachmentRecord.cv.FileExtension;
                const option = {
                    label: name,
                    value: JSON.stringify(attachmentRecord)
                };
                this.picklistOptions = [...this.picklistOptions, option];
            });
            error = undefined;
            this.loadFinished = true;
        } else if (error) {
            console.error(error);
            this.error = error;
            this.picklistOptions = undefined;
            let def_message = 'We have encountered an error while loading up your document. '

            this.showNotification('Error', def_message + error.body.message, 'error');
        }
    };

    showNotification(title, message, variant) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(evt);
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

    handleContentReplace() {
        console.log(this.replaceTerm);

        //validate
        this.template.querySelectorAll('lightning-input').forEach(element => {
            element.reportValidity();
        });

        if (this.replaceTerm) {
            this.loadFinished = false;
            const payload = {
                searchString: this.searchTerm,
                replacementString: this.replaceTerm
            }
            fireEvent(this.pageRef, 'replace', payload);
            this.loadFinished = true;
        } else {
            this.error = 'You need to include a replace text value.'
        }
    }

    search(searchTerm) {
        this.loadFinished = false;
        fireEvent(this.pageRef, 'search', searchTerm);
        this.loadFinished = true;
    }

    //attachment picker change handler
    handleChange(event) {
        this.loadFinished = false;
        this.value = event.detail.value;
        fireEvent(this.pageRef, 'blobSelected', this.value);
        this.loadFinished = true;
    }

    onFileChange(event) {
        if (event.target.files.length > 0) {
            this.uploadedFiles = event.target.files;
            this.fileName = event.target.files[0].name;
            this.file = this.uploadedFiles[0];
            if (this.file.size > this.MAX_FILE_SIZE) {
                alert("File Size Can not exceed" + MAX_FILE_SIZE);
            }
        }
    }
}