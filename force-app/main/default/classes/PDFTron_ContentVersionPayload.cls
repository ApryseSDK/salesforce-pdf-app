public class PDFTron_ContentVersionPayload {
    public String title {get; set;}
    public String filename {get; set;}
    public String base64Data {get; set;}
    public String contentDocumentId {get; set;}

    public static PDFTron_ContentVersionPayload parse(String json) {
        return (PDFTron_ContentVersionPayload) System.JSON.deserialize(json, PDFTron_ContentVersionPayload.class);
    }
}