public with sharing class PDFTron_CMT_Helper implements Metadata.DeployCallback {
    public static void createUpdateMetadata(String fullName, String label, Map<String, Object> fieldWithValuesMap) {
        Metadata.CustomMetadata customMetadata =  new Metadata.CustomMetadata();
        customMetadata.fullName = fullName;
        customMetadata.label = label;
        
        for(String key : fieldWithValuesMap.keySet()){
            Metadata.CustomMetadataValue customField = new Metadata.CustomMetadataValue();
            system.debug('### key: ' + key + ' value: ' + fieldWithValuesMap.get(key));
            customField.field = key;
            customField.value = fieldWithValuesMap.get(key); 
            customMetadata.values.add(customField);
        }
        
        Metadata.DeployContainer mdContainer = new Metadata.DeployContainer();
        mdContainer.addMetadata(customMetadata);
        PDFTron_CMT_Helper callback = new PDFTron_CMT_Helper();
        Id jobId = Metadata.Operations.enqueueDeployment(mdContainer, callback);
    }
    /* Below method recieves the 2 parameters 
       1 - Metadata.DeployResult => Object of MetadataContainer class where this method has been implemented.
       2 - Metadata.DeployCallbackContext => Object of the class where this method has been implemented
   */
    public void handleResult(Metadata.DeployResult result, Metadata.DeployCallbackContext context) {
        if (result.status == Metadata.DeployStatus.Succeeded) {
            // Deployment was successful
            system.debug('Success CMT insert!');
        } else {
            // Deployment was not successful
            system.debug('FAIL CMT insert!');
        }
    }
}