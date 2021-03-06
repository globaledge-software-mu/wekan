(class extends ListProperty {
  onCreated() {
    super.onCreated();
    this.data().getPropertyAlias('card-received') && this.property.set(this.data().getPropertyAlias('card-received'));
    this.currentColor = new ReactiveVar(this.data().getPropertyColor('card-received'));
  }
  
  onRendered() {
    super.onRendered();
  }
  
  _storePropertyAlias(alias) {
    super._storePropertyAlias(alias, 'card-received');
  }
  
  _storeDateWarnings(useDateWarnings) {
    super._storeDateWarnings('card-received', useDateWarnings);
  }
  
  _storeTime(useTime) {
    super._storeTime('card-received', useTime);
  }
  
  _storeColor(color) {
    super._storeColor('card-received', color);
  }
  
  hasDateWarnings() {
    return super.hasDateWarnings('card-received');
  }
  
  hasTime() {
    return super.hasTime('card-received');
  }
}).register('editPropertyCardReceivedPopup');

(class extends ListProperty {
  onCreated() {
    super.onCreated();
    this.data().getPropertyAlias('card-start') && this.property.set(this.data().getPropertyAlias('card-start'));
    this.currentColor = new ReactiveVar(this.data().getPropertyColor('card-start'));
  }
    
  onRendered() {
    super.onRendered();
  }
    
  _storePropertyAlias(alias) {
    super._storePropertyAlias(alias, 'card-start');
  }
  
  _storeDateWarnings(useDateWarnings) {
    super._storeDateWarnings('card-start', useDateWarnings);
  }
  
  _storeTime(useTime) {
    super._storeTime('card-start', useTime);
  }
  
  _storeColor(color) {
    super._storeColor('card-start', color);
  }
  
  hasDateWarnings() {
    return super.hasDateWarnings('card-start');
  }
  
  hasTime() {
    return super.hasTime('card-start');
  }
}).register('editPropertyCardStartPopup');

(class extends ListProperty {
  onCreated() {
    super.onCreated();
    this.data().getPropertyAlias('card-due') && this.property.set(this.data().getPropertyAlias('card-due'));
    this.currentColor = new ReactiveVar(this.data().getPropertyColor('card-due'));
  }

  onRendered() {
    super.onRendered();
  }

  _storePropertyAlias(alias) {
    super._storePropertyAlias(alias, 'card-due');
  }
  
  _storeDateWarnings(useDateWarnings) {
    super._storeDateWarnings('card-due', useDateWarnings);
  }
  
  _storeTime(useTime) {
    super._storeTime('card-due', useTime);
  }
  
  _storeColor(color) {
    super._storeColor('card-due', color);
  }
  
  hasDateWarnings() {
    return super.hasDateWarnings('card-due');
  }
  
  hasTime() {
    return super.hasTime('card-due');
  }
}).register('editPropertyCardDuePopup');

(class extends ListProperty {
  onCreated() {
    super.onCreated();
    this.data().getPropertyAlias('card-end') && this.property.set(this.data().getPropertyAlias('card-end'));
    this.currentColor = new ReactiveVar(this.data().getPropertyColor('card-end'));
  }

  onRendered() {
    super.onRendered();
  }

  _storePropertyAlias(alias) {
    super._storePropertyAlias(alias, 'card-end');
  }
  
  _storeDateWarnings(useDateWarnings) {
    super._storeDateWarnings('card-end', useDateWarnings);
  }
  
  _storeTime(useTime) {
    super._storeTime('card-end', useTime);
  }
  
  _storeColor(color) {
    super._storeColor('card-end', color);
  }
  
  hasDateWarnings() {
    return super.hasDateWarnings('card-end');
  }
  
  hasTime() {
    return super.hasTime('card-end');
  }
}).register('editPropertyCardEndPopup');

(class extends ListProperty {
  onCreated() {
    super.onCreated();
    this.data().getPropertyAlias('members') && this.property.set(this.data().getPropertyAlias('members'));
  }

  onRendered() {
    super.onRendered();
    const selector = $('.color, .date-warnings, .use-time');
    const breakLines = selector.siblings('br');
    breakLines.remove();
    selector.remove();
  }

  _storePropertyAlias(alias) {
    super._storePropertyAlias(alias, 'members');
  }
}).register('editPropertyCardMembersPopup');

(class extends ListProperty {
  onCreated() {
    super.onCreated();
    this.data().getPropertyAlias('team') && this.property.set(this.data().getPropertyAlias('team'));
  }

  onRendered() {
    super.onRendered();
    const selector = $('.color, .date-warnings, .use-time');
    const breakLines = selector.siblings('br');
    breakLines.remove();
    selector.remove();
  }

  _storePropertyAlias(alias) {
    super._storePropertyAlias(alias, 'team');
  }
}).register('editPropertyCardTeamMembersPopup');

(class extends ListProperty {
  onCreated() {
    super.onCreated();
    this.data().getPropertyAlias('labels') && this.property.set(this.data().getPropertyAlias('labels'));
  }

  onRendered() {
    super.onRendered();
    const selector = $('.color, .date-warnings, .use-time');
    const breakLines = selector.siblings('br');
    breakLines.remove();
    selector.remove();
  }

  _storePropertyAlias(alias) {
    super._storePropertyAlias(alias, 'labels');
  }
}).register('editPropertyCardLabelsPopup');

(class extends ListProperty {
  onCreated() {
    super.onCreated();
    this.data().getPropertyAlias('spent-time-hours') && this.property.set(this.data().getPropertyAlias('spent-time-hours'));
  }

  onRendered() {
    super.onRendered();
    const selector = $('.color, .date-warnings, .use-time');
    const breakLines = selector.siblings('br');
    breakLines.remove();
    selector.remove();
  }

  _storePropertyAlias(alias) {
    super._storePropertyAlias(alias, 'spent-time-hours');
  }
}).register('editPropertyCardSpentTimePopup');

(class extends ListProperty {
  onCreated() {
    super.onCreated();
    this.data().getPropertyAlias('description') && this.property.set(this.data().getPropertyAlias('description'));
  }

  onRendered() {
    super.onRendered();
    const selector = $('.color, .date-warnings, .use-time');
    const breakLines = selector.siblings('br');
    breakLines.remove();
    selector.remove();
  }

  _storePropertyAlias(alias) {
    super._storePropertyAlias(alias, 'description');
  }
}).register('editPropertyCardDescriptionPopup');

(class extends ListProperty {
  onCreated() {
    super.onCreated();
    this.data().getPropertyAlias('requested-by') && this.property.set(this.data().getPropertyAlias('requested-by'));
  }

  onRendered() {
    super.onRendered();
    const selector = $('.color, .date-warnings, .use-time');
    const breakLines = selector.siblings('br');
    breakLines.remove();
    selector.remove();
  }

  _storePropertyAlias(alias) {
    super._storePropertyAlias(alias, 'requested-by');
  }
}).register('editPropertyCardRequestedByPopup');

(class extends ListProperty {
  onCreated() {
    super.onCreated();
    this.data().getPropertyAlias('assigned-by') && this.property.set(this.data().getPropertyAlias('assigned-by'));
  }

  onRendered() {
    super.onRendered();
    const selector = $('.color, .date-warnings, .use-time');
    const breakLines = selector.siblings('br');
    breakLines.remove();
    selector.remove();
  }

  _storePropertyAlias(alias) {
    super._storePropertyAlias(alias, 'assigned-by');
  }
}).register('editPropertyCardAssignedByPopup');

(class extends ListProperty {
  onCreated() {
    super.onCreated();
    this.data().getPropertyAlias('aspectsList') && this.property.set(this.data().getPropertyAlias('aspectsList'));
  }

  onRendered() {
    super.onRendered();
    const selector = $('.color, .date-warnings, .use-time');
    const breakLines = selector.siblings('br');
    breakLines.remove();
    selector.remove();
  }

  _storePropertyAlias(alias) {
    super._storePropertyAlias(alias, 'aspectsList');
  }
}).register('editPropertyCardAspectsListsPopup');

(class extends ListProperty {
  onCreated() {
    super.onCreated();
    this.data().getPropertyAlias('checklists') && this.property.set(this.data().getPropertyAlias('checklists'));
  }

  onRendered() {
    super.onRendered();
    const selector = $('.color, .date-warnings, .use-time');
    const breakLines = selector.siblings('br');
    breakLines.remove();
    selector.remove();
  }

  _storePropertyAlias(alias) {
    super._storePropertyAlias(alias, 'checklists');
  }
}).register('editPropertyCardChecklistsPopup');

(class extends ListProperty {
  onCreated() {
    super.onCreated();
    this.data().getPropertyAlias('subtasks') && this.property.set(this.data().getPropertyAlias('subtasks'));
  }

  onRendered() {
    super.onRendered();
    const selector = $('.color, .date-warnings, .use-time');
    const breakLines = selector.siblings('br');
    breakLines.remove();
    selector.remove();
  }

  _storePropertyAlias(alias) {
    super._storePropertyAlias(alias, 'subtasks');
  }
}).register('editPropertyCardSubtasksPopup');

(class extends ListProperty {
  onCreated() {
    super.onCreated();
    this.data().getPropertyAlias('attachments') && this.property.set(this.data().getPropertyAlias('attachments'));
  }

  onRendered() {
    super.onRendered();
    const selector = $('.color, .date-warnings, .use-time');
    const breakLines = selector.siblings('br');
    breakLines.remove();
    selector.remove();
  }

  _storePropertyAlias(alias) {
    super._storePropertyAlias(alias, 'attachments');
  }
}).register('editPropertyCardAttachmentsPopup');

(class extends ListProperty {
  onCreated() {
    super.onCreated();
    this.data().getPropertyAlias('activity') && this.property.set(this.data().getPropertyAlias('activity'));
  }

  onRendered() {
    super.onRendered();
    const selector = $('.color, .date-warnings, .use-time');
    const breakLines = selector.siblings('br');
    breakLines.remove();
    selector.remove();
  }

  _storePropertyAlias(alias) {
    super._storePropertyAlias(alias, 'activity');
  }
}).register('editPropertyCardActivityPopup');

const PropertyAliasForm = BlazeComponent.extendComponent({
  template() {
    return 'propertyAlias';
  },
  
  onCreated() {
    const self = this;
    self.property = ReactiveVar('');
    self.color = ReactiveVar('');
    self.dateWarnings = ReactiveVar('');
  },

  showPropertyAlias() {
    if (this.property !== null) {
      return this.property.get();
    } else {
      return null;
    }
  },
  
  showDateWarning() {
    if (this.dateWarnings !== null) {
      return this.dateWarnings.get();
    } else {
      return null;
    }
  },
  
  showColor() {
    if (this.color !== null) {
      return this.color.get();
    } else {
      return null;
    }
  }
});

Template.propertyAlias.helpers({
  canModifyProperty() {
    return Meteor.user() && Meteor.user().isBoardAdmin();
  },
});

(class extends PropertyAliasForm {
  onCreated() {
    super.onCreated();
    const self = this;
    self.autorun(() => {
      self.property.set(self.data().getPropertyAlias('card-received'));
      let listProperty = self.data().getProperty('card-received');
      if (listProperty !== null) {
        self.color.set(listProperty.color);
        self.dateWarnings.set(listProperty.useDateWarnings);
      }
    });
  }
    
  events() {
    return super.events().concat({
      'click .js-edit-property-alias': Popup.open('editPropertyCardReceived'),
    });
  }
}).register('propertyCardReceived');

(class extends PropertyAliasForm {
  onCreated() {
    super.onCreated();
    const self = this;
    self.autorun(() => {
      self.property.set(self.data().getPropertyAlias('card-start'));
      let listProperty = self.data().getProperty('card-start');
      if (listProperty !== null) {
        self.color.set(listProperty.color);
        self.dateWarnings.set(listProperty.useDateWarnings);
      }
    });
  }
    
  events() {
    return super.events().concat({
      'click .js-edit-property-alias': Popup.open('editPropertyCardStart'),
    });
  }
}).register('propertyCardStart');

(class extends PropertyAliasForm {
  onCreated() {
    super.onCreated();
    const self = this;
    self.autorun(() => {
      self.property.set(self.data().getPropertyAlias('card-due'));
      let listProperty = self.data().getProperty('card-due');
      if (listProperty !== null) {
        self.color.set(listProperty.color);
        self.dateWarnings.set(listProperty.useDateWarnings);
      }
    });
  }
    
  events() {
    return super.events().concat({
      'click .js-edit-property-alias': Popup.open('editPropertyCardDue'),
    });
  }
}).register('propertyCardDue');

(class extends PropertyAliasForm {
  onCreated() {
    super.onCreated();
    const self = this;
      self.autorun(() => {
        self.property.set(self.data().getPropertyAlias('card-end'));
        let listProperty = self.data().getProperty('card-end');
        if (listProperty !== null) {
          self.color.set(listProperty.color);
          self.dateWarnings.set(listProperty.useDateWarnings);
        }
    });
  }
    
  events() {
    return super.events().concat({
      'click .js-edit-property-alias': Popup.open('editPropertyCardEnd'),
    });
  }
}).register('propertyCardEnd');

(class extends PropertyAliasForm {
  onCreated() {
    super.onCreated();
    const self = this;
    self.autorun(() => {
      self.property.set(self.data().getPropertyAlias('members'));
    });
  }
    
  events() {
    return super.events().concat({
      'click .js-edit-property-alias': Popup.open('editPropertyCardMembers'),
    });
  }
}).register('propertyCardMembers');

(class extends PropertyAliasForm {
  onCreated() {
    super.onCreated();
    const self = this;
    self.autorun(() => {
      self.property.set(self.data().getPropertyAlias('team'));
    });
  }
    
  events() {
    return super.events().concat({
      'click .js-edit-property-alias': Popup.open('editPropertyCardTeamMembers'),
    });
  }
}).register('propertyCardTeamMembers');

(class extends PropertyAliasForm {
  onCreated() {
    super.onCreated();
    const self = this;
    self.autorun(() => {
      self.property.set(self.data().getPropertyAlias('labels'));
    });
  }
    
  events() {
    return super.events().concat({
      'click .js-edit-property-alias': Popup.open('editPropertyCardLabels'),
    });
  }
}).register('propertyCardLabels');

(class extends PropertyAliasForm {
  onCreated() {
    super.onCreated();
    const self = this;
    self.autorun(() => {
      self.property.set(self.data().getPropertyAlias('spent-time-hours'));
    });
  }
    
  events() {
    return super.events().concat({
      'click .js-edit-property-alias': Popup.open('editPropertyCardSpentTime'),
    });
  }
}).register('propertyCardSpentTime');

(class extends PropertyAliasForm {
  onCreated() {
    super.onCreated();
    const self = this;
    self.autorun(() => {
      self.property.set(self.data().getPropertyAlias('description'));
    });
  }
    
  events() {
    return super.events().concat({
      'click .js-edit-property-alias': Popup.open('editPropertyCardDescription'),
    });
  }
}).register('propertyCardDescription');

(class extends PropertyAliasForm {
  onCreated() {
    super.onCreated();
    const self = this;
    self.autorun(() => {
      self.property.set(self.data().getPropertyAlias('requested-by'));
    });
  }
    
  events() {
    return super.events().concat({
      'click .js-edit-property-alias': Popup.open('editPropertyCardRequestedBy'),
    });
  }
}).register('propertyCardRequestedBy');

(class extends PropertyAliasForm {
  onCreated() {
    super.onCreated();
    const self = this;
    self.autorun(() => {
      self.property.set(self.data().getPropertyAlias('assigned-by'));
    });
  }
    
  events() {
    return super.events().concat({
      'click .js-edit-property-alias': Popup.open('editPropertyCardAssignedBy'),
    });
  }
}).register('propertyCardAssignedBy');

(class extends PropertyAliasForm {
  onCreated() {
    super.onCreated();
    const self = this;
    self.autorun(() => {
      self.property.set(self.data().getPropertyAlias('aspectsList'));
    });
  }
      
  events() {
    return super.events().concat({
      'click .js-edit-property-alias': Popup.open('editPropertyCardAspectsList'),
    });
  }
}).register('propertyCardAspectsList');

(class extends PropertyAliasForm {
  onCreated() {
    super.onCreated();
    const self = this;
    self.autorun(() => {
      self.property.set(self.data().getPropertyAlias('checklists'));
    });
  }
      
  events() {
    return super.events().concat({
      'click .js-edit-property-alias': Popup.open('editPropertyCardChecklists'),
    });
  }
}).register('propertyCardChecklists');

(class extends PropertyAliasForm {
  onCreated() {
    super.onCreated();
    const self = this;
    self.autorun(() => {
      self.property.set(self.data().getPropertyAlias('subtasks'));
    });
  }
      
  events() {
    return super.events().concat({
      'click .js-edit-property-alias': Popup.open('editPropertyCardSubtasks'),
    });
  }
}).register('propertyCardSubtasks');

(class extends PropertyAliasForm {
  onCreated() {
    super.onCreated();
    const self = this;
    self.autorun(() => {
      self.property.set(self.data().getPropertyAlias('attachments'));
    });
  }
      
  events() {
    return super.events().concat({
      'click .js-edit-property-alias': Popup.open('editPropertyCardAttachments'),
    });
  }
}).register('propertyCardAttachments');

(class extends PropertyAliasForm {
  onCreated() {
    super.onCreated();
    const self = this;
    self.autorun(() => {
      self.property.set(self.data().getPropertyAlias('activity'));
    });
  }
      
  events() {
    return super.events().concat({
      'click .js-edit-property-alias': Popup.open('editPropertyCardActivity'),
    });
  }
}).register('propertyCardActivity');
