import { LightningElement, track, wire } from 'lwc';
import { publish, MessageContext } from 'lightning/messageService';
import WebViewerMC from "@salesforce/messageChannel/WebViewerMessageChannel__c"

export default class PdftronSideBar extends LightningElement {
    @track currentSection = '';
    @wire(MessageContext)
    context;

    handleToggleSection(event) {
        console.log(`Open section: ${event.detail.openSections}`);
        this.currentSection = event.detail.openSections;
        let payload = {
            source: "pdftronSideBar",
            messageBody: this.currentSection
        }

        console.log(payload);

        publish(this.context, WebViewerMC, payload);
    }
}