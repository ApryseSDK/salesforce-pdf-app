import { LightningElement, track, api, wire } from 'lwc'
import { CurrentPageReference } from 'lightning/navigation'
import getSObjects from '@salesforce/apex/PDFTron_ContentVersionController.getSObjects'
import getObjectFields from '@salesforce/apex/PDFTron_ContentVersionController.getObjectFields'
import queryValuesFromRecord from '@salesforce/apex/PDFTron_ContentVersionController.queryValuesFromRecord'
import searchSOSL from '@salesforce/apex/PDFTron_ContentVersionController.searchSOSL'
import { ShowToastEvent } from 'lightning/platformShowToastEvent'
import { fireEvent, registerListener, unregisterAllListeners } from 'c/pubsub'

export default class PdftronTemplateMapper extends LightningElement {
  columns
  errors = []
  isLoading = false
  mapping = {}
  apiNameToTemplateKeyMap = {}

  @api doctemplate

  @track showTable = false
  @track recordSearched
  @track recordId
  @track value
  @track rows = []
  @track values = []
  @track sObjects = []
  @track selectedObject = ''
  @track sObjectFields = []

  @wire(CurrentPageReference)
  pageRef

  @wire(getSObjects)
  attachments ({ error, data }) {
    if (data) {
      data.forEach(object => {
        let option = {
          label: object,
          value: object
        }
        this.sObjects = [...this.sObjects, option]
      })
      error = undefined
    } else if (error) {
      console.error(error)
      this.error = error

      this.showNotification('Error', error.body.message, 'error')
    }
  }

  connectedCallback () {
    registerListener('doc_gen_options', this.handleOptions, this)
    registerListener('closeDocument', this.closeDocument, this);
    this.columns = [
      {
        label: 'Template Key',
        apiName: 'templateKey',
        fieldType: 'text',
        objectName: 'sObject'
      },
      {
        label: 'Field API Name',
        apiName: 'Value',
        fieldType: 'text',
        objectName: 'sObject'
      }
    ]
  }

  renderedCallback () {
    if (this.rows.length > 0) {
      this.showTable = true
    }
  }

  disconnectedCallback () {
    unregisterAllListeners(this)
  }

  createUUID () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (
      c
    ) {
      var r = (Math.random() * 16) | 0,
        v = c == 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  closeDocument() {
    this.showTable = false
  }

  handleSearch (event) {
    const lookupElement = event.target
    searchSOSL(event.detail)
      .then(results => {
        console.log('searchResults', results)
        lookupElement.setSearchResults(results)
      })
      .catch(error => {
        // TODO: handle error
        this.error = error
        console.error(error)
        let def_message =
          'We have encountered an error while searching your file. '

        this.showNotification(
          'Error',
          def_message + error.body.message,
          'error'
        )
      })
  }

  handleSObjectChange (event) {
    this.selectedObject = event.detail.value
    console.log('this.selectedObject', this.selectedObject)

    getObjectFields({ objectName: this.selectedObject })
      .then(data => {
        this.sObjectFields = []
        data.forEach(field => {
          let option = {
            label: field,
            value: field
          }
          this.sObjectFields = [...this.sObjectFields, option]
        })
      })
      .catch(error => {
        alert(error.body)
        console.error(error)
      })
  }

  handleSaveTemplate () {
    let templateData = {}

    templateData['sobject'] = this.selectedObject
    templateData['mapping'] = this.apiNameToTemplateKeyMap
    templateData['templateName'] = this.doctemplate.title
    templateData['templateId'] = this.doctemplate.id

    fireEvent(this.pageRef, 'handleModal', templateData);
  }

  handleFill () {
    this.isLoading = true
    //this.validateFields()

    this.mapping = {}
    this.apiNameToTemplateKeyMap = {}
    const selectedFields = this.template.querySelectorAll('.dropdownfields') //get all dropdown selections
    let comboboxfields = [] //list of fields to query from apex

    //fill above from user input to dropdowns
    selectedFields.forEach(field => {
      comboboxfields.push(field.value)
      this.apiNameToTemplateKeyMap[field.value] = field.dataset.templatekey
    })

    //send list of fields to Apex and query via dynamic SOQL
    queryValuesFromRecord({
      recordId: this.recordId,
      objectName: this.selectedObject,
      fields: comboboxfields
    })
      .then(data => {
        this.isLoading = false

        //returns map of Salesforce field API: value - need to convert it to templatekey: value
        var newHashmap = {}
        Object.keys(data[0]).forEach(key => {
          var value = data[0][key]
          key = this.apiNameToTemplateKeyMap[key]
            ? this.apiNameToTemplateKeyMap[key]
            : key
          newHashmap[key] = value
        })

        this.mapping = newHashmap

        fireEvent(this.pageRef, 'doc_gen_mapping', this.mapping)
      })
      .catch(error => {
        this.isLoading = false

        this.showNotification(
          'Error',
          'There was an error when trying to preview your template: \n' +
            error.body.message,
          'error'
        )
        console.error(error)
      })
  }

  validateFields () {
    //turn off spinner
    this.isLoading === true ? this.isLoading = false : ''
    //validate lightning-input
    this.template.querySelectorAll('lightning-input, lightning-combobox, c-lookup').forEach(element => {
      element.reportValidity()
    })
  }

  handleSingleSelectionChange (event) {
    if (event.detail.length < 1) {
      this.recordSearched = false
      this.recordId = ''
      this.selectedObject = ''
      return
    }

    const selection = this.template.querySelector('c-lookup').getSelection()

    this.recordSearched = true

    this.recordId = selection[0].id
    this.selectedObject = selection[0].sObjectType

    getObjectFields({ objectName: this.selectedObject })
      .then(data => {
        this.sObjectFields = []
        data.forEach(field => {
          let option = {
            label: field,
            value: field
          }
          this.sObjectFields = [...this.sObjectFields, option]
        })
      })
      .catch(error => {
        console.error(error)
      })
  }

  checkForErrors () {
    this.errors = []
    const selection = this.template.querySelector('c-lookup').getSelection()
    // Custom validation rule
    if (this.isMultiEntry && selection.length > this.maxSelectionSize) {
      this.errors.push({
        message: `You may only select up to ${this.maxSelectionSize} items.`
      })
    }
    // Enforcing required field
    if (selection.length === 0) {
      this.errors.push({ message: 'Please make a selection.' })
    }
  }

  handleRecordId (event) {
    this.recordId = event.target.value
  }

  handleOptions (keys) {
    this.rows = []
    for (const i in keys) {
      this.rows = [
        ...this.rows,
        {
          uuid: this.createUUID(),
          templateKey: keys[i],
          placeholder: `Replace {{${keys[i]}}}`
        }
      ]
    }
    this.showTable = true
  }

  handleChange (event) {
    this.mapping[event.target.dataset.key] = event.target.value
  }

  showNotification (title, message, variant) {
    const evt = new ShowToastEvent({
      title: title,
      message: message,
      variant: variant
    })
    this.dispatchEvent(evt)
  }
}
