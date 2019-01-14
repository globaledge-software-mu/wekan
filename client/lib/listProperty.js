let labelColors;
Meteor.startup(() => {
  labelColors = Boards.simpleSchema()._schema['labels.$.color'].allowedValues;
});

ListProperty = BlazeComponent.extendComponent({
  template() {
    return 'editPropertyAlias';
  },
  
  onCreated() {
    this.error = new ReactiveVar('');
    this.list = this.data();
    this.property = new ReactiveVar('');
  },
  
  _storePropertyAlias(alias, i18nKey) {
    const property = ListProperties.findOne({listId: this.list._id, i18nKey: i18nKey});
    if (typeof property !== 'undefined') {
      ListProperties.update({_id: property._id}, {$set: {alias}})
    } else {
      ListProperties.insert({i18nKey: i18nKey, boardId: this.list.boardId, listId: this.list._id, alias: alias});
    }
  },
  
  _storeDateWarnings(i18nKey, useDateWarnings) {
    const property = ListProperties.findOne({listId: this.list._id, i18nKey: i18nKey});
    if (typeof property !== 'undefined') {
      ListProperties.update({_id: property._id}, {$set: {useDateWarnings}})
    }
  },
  
  _storeColor(i18nKey, color) {
    const property = ListProperties.findOne({listId: this.list._id, i18nKey: i18nKey});
    if (typeof property !== 'undefined') {
      ListProperties.update({_id: property._id}, {$set: {color}})
    }
  },
  
  showPropertyAlias() {
    return this.property.get();
  },
  
  hasDateWarnings(i18nKey) {
    const property = ListProperties.findOne({listId: this.list._id, i18nKey: i18nKey});
    if (typeof property !== 'undefined') {
      let useDateWarnings = (property.hasOwnProperty('useDateWarnings')) ? property.useDateWarnings : false;
      return useDateWarnings
    }
  },
  
  labels() {
    return labelColors.map((color) => ({ color, name: '' }));
  },

  isSelected(color) {
    if (typeof this.currentColor === 'undefined') {
      return false
    }
    return this.currentColor.get() === color;
  },
  
  events() {
    return [{
      'submit .edit-property-alias'(evt) {
        evt.preventDefault();
        const alias = evt.target.propertyAlias.value;
        if (alias == '') {
          this.error.set('property-alias-invalid');
          evt.target.propertyAlias.focus();
          return false;
        }
        this._storePropertyAlias(alias);
        if ($('#warning').length) {
          var checked = $('#warning .materialCheckBox').hasClass('is-checked');
          this._storeDateWarnings(checked);
        }
        
        if ($('.fa-check').length) {
          const color = Blaze.getData($('.fa-check').get(0)).color;
          this._storeColor(color);
        }
        
        Popup.back();
      },
      'click .js-cancel-alias-edit' (evt) {
        Popup.back();
      },
      'click .date-warnings' (evt) {
        const value = evt.target.id || $(evt.target).parent()[0].id ||  $(evt.target).parent()[0].parent()[0].id;
        var checked = $(`#${value} .materialCheckBox`).hasClass('is-checked');
        $(`#${value} .materialCheckBox`).toggleClass('is-checked', !checked);
        $(`#${value}`).toggleClass('is-checked', !checked);
      },
      'click .js-palette-color'() {
        this.currentColor.set(this.currentData().color);
      }
    }]
  }
});
