@isTest
private class PDFTron_ContentVersionControllerTest {
  @TestSetup
  static void setupTestData() {
    //Other User
    String uniqueUserName =
      'standarduser' +
      DateTime.now().getTime() +
      '@testorg.com';
    Profile p = [SELECT Id FROM Profile WHERE Name = 'Standard User'];
    User u = new User(
      Alias = 'standt',
      Email = 'standarduser@testorg.com',
      EmailEncodingKey = 'UTF-8',
      LastName = 'Testing',
      LanguageLocaleKey = 'en_US',
      LocaleSidKey = 'en_US',
      ProfileId = p.Id,
      TimeZoneSidKey = 'America/Los_Angeles',
      UserName = uniqueUserName
    );

    //Test Account
    Account a = new Account();
    a.Name = 'Test Account';

    insert a;

    //Test File
    ContentVersion contentVersion_1 = new ContentVersion(
      Title = 'some title',
      PathOnClient = 'some title' + '.pdf',
      VersionData = Blob.valueOf('some content to access later on'),
      IsMajorVersion = false /*so that can be updated later on*/
    );
    insert contentVersion_1;
  }

  @isTest
  static void testGetFileDataFromId() {
    String cvId = [SELECT Id FROM ContentVersion].Id;
    PDFTron_ContentVersionController.ContentVersionWrapper cvw = PDFTron_ContentVersionController.getFileDataFromId(
      cvId
    );

    System.assertNotEquals(null, cvw);
  }

  @isTest
  static void testGetFileLogo() {
    String testExtension = 'pdf';
    String testResult = PDFTron_ContentVersionController.getFileLogo(
      testExtension
    );
    System.assertEquals('doctype:pdf', testResult);

    testExtension = 'docx';
    testResult = PDFTron_ContentVersionController.getFileLogo(testExtension);
    System.assertEquals('doctype:word', testResult);

    testExtension = 'xlsx';
    testResult = PDFTron_ContentVersionController.getFileLogo(testExtension);
    System.assertEquals('doctype:excel', testResult);

    testExtension = 'jpg';
    testResult = PDFTron_ContentVersionController.getFileLogo(testExtension);
    System.assertEquals('doctype:image', testResult);
  }

  @isTest
  static void testconvertBytesToFormattedString() {
    String testExtension = 'pdf';
    String testResult = PDFTron_ContentVersionController.convertBytesToFormattedString(
      2000
    );

    testResult = PDFTron_ContentVersionController.convertBytesToFormattedString(
      2000000
    );
    System.assertEquals('1.91 MB', testResult);

    testResult = PDFTron_ContentVersionController.convertBytesToFormattedString(
      2000000000
    );
    System.assertEquals('1.86 GB', testResult);
  }

  @isTest
  static void testGetUser() {
    String userFullName = PDFTron_ContentVersionController.getUser();
    System.assertNotEquals(userFullName, null);
    User currentUser = [
      SELECT FirstName, LastName
      FROM User
      WHERE username = :UserInfo.getUsername()
    ];
    System.assertEquals(
      currentUser.FirstName +
      ' ' +
      currentUser.LastName,
      userFullName
    );
  }

  @isTest
  static void testGetBase64FromCv() {
    ContentVersion contentVersion_1 = [
      SELECT Id, Title, FileExtension, VersionData
      FROM ContentVersion
      WHERE Title = 'some title'
      LIMIT 1
    ];
    System.assertNotEquals(contentVersion_1.Id, null);

    PDFTron_ContentVersionController.ContentVersionWrapper cvw = PDFTron_ContentVersionController.getBase64FromCv(
      contentVersion_1.Id + ''
    );
    System.assertNotEquals(cvw.body, null);
  }

  @isTest
  static void testGetAttachments() {
    ContentVersion contentVersion_1 = [
      SELECT Id, Title, FileExtension, VersionData, ContentDocumentId
      FROM ContentVersion
      WHERE Title = 'some title'
      LIMIT 1
    ];
    Account a = [SELECT Id FROM Account WHERE Name = 'Test Account'];
    ContentDocumentLink contentDocumentLink = new ContentDocumentLink(
      LinkedEntityId = a.Id,
      ContentDocumentId = contentVersion_1.ContentDocumentId,
      ShareType = 'V'
    );
    insert contentDocumentLink;

    string id = a.Id + '';

    List<PDFTron_ContentVersionController.ContentVersionWrapper> cvwList = PDFTron_ContentVersionController.getAttachments(
      id
    );

    System.assertEquals(cvwList.size(), 1);
  }

  @isTest
  static void testGetExistingAttachments() {
    ContentVersion contentVersion_1 = [
      SELECT Id, Title, FileExtension, VersionData, ContentDocumentId
      FROM ContentVersion
      WHERE Title = 'some title'
      LIMIT 1
    ];
    Account a = [SELECT Id FROM Account WHERE Name = 'Test Account'];
    ContentDocumentLink contentDocumentLink = new ContentDocumentLink(
      LinkedEntityId = a.Id,
      ContentDocumentId = contentVersion_1.ContentDocumentId,
      ShareType = 'V'
    );
    insert contentDocumentLink;

    string id = a.Id + '';

    List<LookupSearchResult> cvwList = PDFTron_ContentVersionController.getExistingAttachments(
      id
    );

    System.assertEquals(cvwList.size(), 1);
  }

  @isTest
  static void testSearch() {
    List<String> selectedIds = new List<String>{ 'fake id' };
    List<LookupSearchResult> results = PDFTron_ContentVersionController.search(
      'some',
      selectedIds
    );
    System.assertEquals(results.size(), 1);
  }

  @isTest
  static void testSaveDocument() {
    String payload = '{"title": "file-sample_150kB test", "filename": "file-sample_150kB test.pdf", "contentDocumentId": "0685Y00000QUaQGQA1" }';

    PDFTron_ContentVersionController.PDFTron_ContentVersionPayload cvp = new PDFTron_ContentVersionController.PDFTron_ContentVersionPayload(
      payload
    );

    cvp.base64Data = EncodingUtil.base64Encode(Blob.valueOf('Test Blob Data'));

    ContentVersion contentVersion_1 = [
      SELECT Id, Title, FileExtension, VersionData
      FROM ContentVersion
      WHERE Title = 'some title'
      LIMIT 1
    ];
    Account a = [SELECT Id FROM Account WHERE Name = 'Test Account'];
    String cvId = PDFTron_ContentVersionController.saveDocument(
      JSON.serialize(cvp),
      a.Id,
      contentVersion_1.Id
    );

    List<ContentVersion> savedDocuments = [
      SELECT Id, VersionData
      FROM ContentVersion
      WHERE Title = 'file-sample_150kB test'
    ];
    System.assertEquals(savedDocuments.size(), 1);
  }
}
