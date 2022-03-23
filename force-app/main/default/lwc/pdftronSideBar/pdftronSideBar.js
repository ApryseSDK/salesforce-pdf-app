import { LightningElement, track, wire } from 'lwc';
import { publish, MessageContext } from 'lightning/messageService';
import WebViewerMC from "@salesforce/messageChannel/WebViewerMessageChannel__c"

export default class PdftronSideBar extends LightningElement {
    @track currentSection = '';
    @wire(MessageContext)
    context;

    handleToggleSection(event) {
        this.currentSection = event.detail.openSections;
        let payload = {
            source: "pdftronSideBar",
            messageBody: this.currentSection
        }


        publish(this.context, WebViewerMC, payload);
    }
}