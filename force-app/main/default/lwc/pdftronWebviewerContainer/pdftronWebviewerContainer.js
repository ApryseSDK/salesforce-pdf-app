import { LightningElement, api, track } from 'lwc';
import { publish, createMessageContext, releaseMessageContext, subscribe, unsubscribe } from 'lightning/messageService';
import WebViewerMC from "@salesforce/messageChannel/WebViewerMessageChannel__c";

export default class PdftronWebviewerContainer extends LightningElement {
    @api flexipageRegionWidth
    @api recordId;
    @track renderVideo = false;
    channel;
    context = createMessageContext();

    connectedCallback() {
        this.handleSubscribe();
    }

    disconnectedCallback() {
        this.handleUnsubscribe();
    }

    handleSubscribe() {
        if (this.channel) {
            return;
        }
        this.channel = subscribe(this.context, WebViewerMC, (message) => {
            if (message) {
                console.log('Container received: ' + message);
                if(message.messageBody === 'Video') {
                    this.renderVideo = true;
                } else {
                    this.renderVideo = false;
                }
            }
        });
    }

    handleUnsubscribe() {
        releaseMessageContext(this.context);
        unsubscribe(this.channel);
    }
}