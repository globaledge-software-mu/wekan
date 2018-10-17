BlazeComponent.extendComponent({
  editDescription(evt) {
    evt.preventDefault();
    const newDescription = this.childComponents('inlinedForm')[0].getValue().trim();
    const list = this.currentData();
    list.setDescription(newDescription);
  },

  events() {
    return [{
      submit: this.editDescription,
    }];
  },
}).register('listDescription');