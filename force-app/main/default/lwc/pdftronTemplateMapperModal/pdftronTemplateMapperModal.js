import { LightningElement, track, api, wire } from 'lwc'
import { CurrentPageReference } from 'lightning/navigation'
import { fireEvent, registerListener, unregisterAllListeners } from 'c/pubsub'
import { ShowToastEvent } from 'lightning/platformShowToastEvent'
import createCMTRecord from '@salesforce/apex/PDFTron_ContentVersionController.createCMTRecord'

const columns = [
  { label: 'Key', fieldName: 'key' },
  { label: 'Value', fieldName: 'value' }
]

export default class PdftronTemplateMapperModal extends LightningElement {
  data = []
  columns = columns

  @track isModalOpen = false
  @track templateName = ''
  @track cmtName = ''
  @track sObjectName = ''
  @track mapping = {}
  @track apexMap = {}

  @wire(CurrentPageReference)
  pageRef

  connectedCallback () {
    registerListener('handleModal', this.handleModal, this)
  }

  handleTemplateName (event) {
    this.cmtName = event.target.value
  }

  handleModal (templatedata) {
    this.mapping = {}
    this.apexMap = {}
    if (this.isModalOpen) {
      this.isModalOpen = false
    } else {
      this.isModalOpen = true
    }
    this.buildMaps(templatedata)
    this.fillTable()
  }

  buildMaps (templatedata) {
    this.templateName = templatedata.templateName
    this.sObjectName = templatedata.sobject
    this.mapping = templatedata.mapping
    this.apexMap['mapping'] = JSON.stringify(templatedata.mapping)
    this.mapping['templateName'] = this.templateName
    this.mapping['sObjectName'] = this.sObjectName
    this.apexMap['templateName'] = this.templateName
    this.apexMap['sObjectName'] = this.sObjectName
    this.apexMap['templateId'] = templatedata.templateId
  }

  createRecord () {
    this.apexMap['cmtName'] = this.cmtName
    // creates a JSON representation of the CMT record
    createCMTRecord({ jsonString: JSON.stringify(this.apexMap) })
      .then(result => {
        this.recordId = result
        console.log(result)
        this.showNotification(`${this.cmtName} `, `Your template has been saved to custom metadata successfully!`, 'success')
        this.closeModal()
      })
      .catch(error => {
        console.log(error)
        if (error.body.message) {
          this.showNotification(
            'Error',
            'An error occured when saving your template:\n' +
              error.body.message,
            'error'
          )
        }
        this.error = error
      })
  }

  showNotification (title, message, variant) {
    const evt = new ShowToastEvent({
      title: title,
      message: message,
      variant: variant
    })
    this.dispatchEvent(evt)
  }

  fillTable () {
    this.data = []
    Object.keys(this.mapping).forEach(key => {
      let row = {}
      row['key'] = key
      row['value'] = this.mapping[key]
      this.data.push(row)
    })
  }

  openModal () {
    this.isModalOpen = true
  }

  closeModal () {
    this.isModalOpen = false
  }
}
