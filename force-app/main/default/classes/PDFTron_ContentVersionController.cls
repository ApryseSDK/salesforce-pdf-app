public with sharing class PDFTron_ContentVersionController {
    @AuraEnabled(Cacheable=true)
    public static List<ContentVersionWrapper> getAttachments(String recordId){
        try {
            List<String> cdIdList = new List<String> ();
            List<ContentVersionWrapper> cvwList = new List<ContentVersionWrapper> ();

            //Define supported file extensions
            Set<String> fileFormats = new Set<String> {
                    'pdf', 
                    'xfdf',
                    'fdf',
                    'doc',
                    'docx', 
                    'xlsx',
                    'ppt',
                    'pptx',
                    'jpg',
                    'jpeg',
                    'png',
                    'mov',
                    'tif',
                    'xls',
                    'xlsx'
            };
            //Find links between record & document
            for(ContentDocumentLink cdl : 
                    [   SELECT id, ContentDocumentId, ContentDocument.LatestPublishedVersionId 
                        FROM ContentDocumentLink 
                        WHERE LinkedEntityId = :recordId    ]) {
                cdIdList.add(cdl.ContentDocumentId);
            }
            //Use links to get attachments
            for(ContentVersion cv : 
                    [   SELECT Id, Title,FileExtension, VersionData 
                        FROM ContentVersion 
                        WHERE ContentDocumentId IN :cdIdList 
                        AND IsLatest = true ]) {
                if(fileFormats.contains(cv.FileExtension.toLowerCase())) {
                    System.debug('Converting CV: ' + cv.Id);
                    cvwList.add(new ContentVersionWrapper(cv));
                    System.debug('Completed CV Conversion:' + cv);
                }
            }
            system.debug(cvwList);
            return cvwList;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static void saveDocument(String json, String recordId) {
        try {
            PDFTron_ContentVersionPayload pl = PDFTron_ContentVersionPayload.parse(json);
            ContentVersion cv = new ContentVersion();
            // 'S' = a Salesforce File
            cv.ContentLocation = 'S';
            if(pl.contentDocumentId != null) {
                cv.ContentDocumentId = pl.contentDocumentId;
                cv.ReasonForChange = 'Saved from WebViewer';//only for file updates
            } else {
                for(ContentDocumentLink cdl : 
                    [   SELECT ContentDocumentId, ContentDocument.Title
                        FROM ContentDocumentLink 
                        WHERE LinkedEntityId = :recordId
                        AND ContentDocument.Title = :pl.title ]) {
                            if(cdl.ContentDocumentId != null) {
                                cv.ContentDocumentId = cdl.ContentDocumentId;
                            }
                        }
            }
            cv.VersionData = EncodingUtil.base64Decode(pl.base64Data);
            cv.Title = pl.title;
            cv.PathOnClient = pl.filename;
            
            system.debug('### Upserting cv: ' + cv);
            upsert cv; 
        } catch (Exception e) {
            system.debug('### ERROR: ' + e.getMessage());
            throw new AuraHandledException(e.getMessage());
        }
    }

    public class ContentVersionWrapper {
        @AuraEnabled
        public String name {get; set;}
        @AuraEnabled
        public String body {get; set;}
        @AuraEnabled
        public ContentVersion cv;
        
        public ContentVersionWrapper(ContentVersion contentVer) {
            this.cv = contentVer;
            this.name = contentVer.Title + '.' + contentVer.FileExtension;
            this.body = EncodingUtil.base64Encode(contentVer.VersionData);
        }
    }
}
