//Display Initial, End, Current and Target Scores
const CardScoreForm = BlazeComponent.extendComponent({
  template() {
    return 'scoreBadge';
  },
  
  onCreated() {
    const self = this;
    self.score = ReactiveVar('');
  },

  showScore() {
    return this.score.get();
  }
});

Template.scoreBadge.helpers({
  canModifyCard() {
    return Meteor.user() && Meteor.user().isBoardMember() && !Meteor.user().isCommentOnly();
  },
});

class CardInitialScore extends CardScoreForm {
  onCreated() {
    super.onCreated();
    const self = this;
    self.autorun(() => {
      self.score.set(self.data().getInitialScore());
    });
  }
  
  classes() {
    let classes = 'received-date ';
    let property = this.data().list().getProperty('card-received');
    if (property !== null) {
      classes += 'card-label-' + property.color + ' date';
    } else {
        classes +=  'card-label-silver';
    }
    return classes;
  }

  events() {
    return super.events().concat({
      'click .js-edit-date': Popup.open('editCardReceivedDate'),
    });
  }
}
CardInitialScore.register('cardInitialScore');

class CardEndScore extends CardScoreForm {
  onCreated() {
    super.onCreated();
    const self = this;
    self.autorun(() => {
      self.score.set(self.data().getEndScore());
    });
  }
  
  classes() {
    let classes = 'end-date ';
    let property = this.data().list().getProperty('card-end');
    if (property !== null) {
      classes += 'card-label-' + property.color + ' date';
    } else {
        classes += 'card-label-silver';
    }
    return classes;
  }

  events() {
    return super.events().concat({
      'click .js-edit-date': Popup.open('editCardEndDate'),
    });
  }
}
CardEndScore.register('cardEndScore');

class CardCurrentScore extends CardScoreForm {
  onCreated() {
    super.onCreated();
    const self = this;
    self.autorun(() => {
      self.score.set(self.data().getCurrentScore());
    });
  }
  
  classes() {
    let classes = 'start-date ';
    let property = this.data().list().getProperty('card-start');
    if (property !== null) {
      classes += 'card-label-' + property.color + ' date';
    } else {
      classes += 'card-label-silver';
    }
    return classes;
  }
  
  events() {
    return super.events().concat({
      'click .js-edit-date': Popup.open('editCardStartDate'),
    });
  }
}
CardCurrentScore.register('cardCurrentScore');

class CardTargetScore extends CardScoreForm {
  onCreated() {
    super.onCreated();
    const self = this;
    self.autorun(() => {
      self.score.set(self.data().getTargetScore());
    });
  }
  
  classes() {
    let classes = 'due-date ';
    let property = this.data().list().getProperty('card-due');
    if (property !== null) {
      classes += 'card-label-' + property.color + ' date';
    } else {
      classes += 'card-label-silver';
    }
    return classes;
  }

  events() {
    return super.events().concat({
      'click .js-edit-date': Popup.open('editCardDueDate'),
    });
  }
}
CardTargetScore.register('cardTargetScore');
