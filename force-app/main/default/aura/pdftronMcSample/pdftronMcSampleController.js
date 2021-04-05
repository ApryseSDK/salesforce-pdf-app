({
    //LMS publisher
    publishMC : function(component, event, helper) {
        let payload = {
            messageBody: component.get("v.message"),
            source: "pdftronMcSample Aura Component"
        }

        /*
        //sample payload - any JS data type can be sent in a serializable JS object
        let payload = {
            message: "some message",
            source: "sample aura component",
            any_other_data: {
                whatever_you_need: "just add it here"
            },
            numerical_data: 5,
            string_data: "hello",
            bool_data: false
            //etc..
        } 
        */

        //get message channel via aura:id
        component.find("webviewerMessageChannel").publish(payload);
    },

    // LMS Listener
    handleReceiveMessage: function (component, event, helper) {
        if (event != null) {
            const message = event.getParam('message');
            const source = event.getParam('source');
            
            //do stuff
            console.log(`Your message is: ${message} - received from ${source}`);
        }
    }
})
