import { LightningElement, track, wire, api } from 'lwc';
import { fireEvent, registerListener, unregisterAllListeners } from 'c/pubsub';
import { CurrentPageReference } from 'lightning/navigation';


export default class ExportFile extends LightningElement {

    @wire(CurrentPageReference)
    pageRef;

    file_options;
    value;

    payload;

    hasSpinner = false;
    
    pdf_options = [
        { label: 'JPG', value: 'jpg' },
        { label: 'PNG', value: 'png' }
    ]

    other_options = [
        { label: 'PDF', value: 'pdf' }
    ]

    connectedCallback() {
        registerListener('blobSelected', this.handleBlobSelected, this);
        registerListener('clearSelected', this.handleClearSelected, this);
        registerListener('finishConvert', this.handleFinishConvert, this);
    }

    handleClearSelected(){
        this.file_options = [];
        this.value = undefined;
        this.payload = undefined;
    }

    handleBlobSelected(record) {
        if (record.cv.FileExtension == 'pdf'){
            this.file_options = this.pdf_options;
            this.value = 'jpg';
        } else { 
            this.file_options = this.other_options;
            this.value = 'pdf';
        }
        this.payload = {
            value: this.value
        }
    }

    


    handleExport(){
        if(this.value){
            this.hasSpinner = true;
            this.payload.transport = 'EXPORT_DOCUMENT';
            fireEvent(this.pageRef, 'transportDocument', this.payload);
        }
    }

    handleDownload(){
        if(this.value){
            this.hasSpinner = true;
            this.payload.transport = 'DOWNLOAD_DOCUMENT';
            fireEvent(this.pageRef, 'transportDocument', this.payload);
        }
    }


    handleChange(event){
        const label = event.target.options.find(opt => opt.value === event.detail.value).label;
        this.value = event.detail.value;
        this.payload = {
            value: event.detail.value
        }
        
    }

    handleFinishConvert(){
        this.hasSpinner = false;
    }
}