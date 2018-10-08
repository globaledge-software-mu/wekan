//editCardScorePopup
(class extends CardScores {
  onCreated() {
    super.onCreated();
    this.data().getDue() && this.date.set(moment(this.data().getDue()));
  }

  onRendered() {
    super.onRendered();
  }

  _storeScores(dueAt, currentScore, targetScore) {
    this.card.setScores(dueAt, currentScore, targetScore);
    this.card.reloadHistoricScoreChart();
  }
  
  _deleteDate() {
    this.card.setDue(null);
  }
  
  _delete() {
    this.card.deleteCurrentScore();
    this.card.deleteTargetScore();
    this.card.setDue(null);
  }
}).register('editCardScoresPopup');

//Edit Initial, End, Current and Target Scores
BlazeComponent.extendComponent({
  template() {
    return 'editCardScore';
  },

  onCreated() {
    this.error = new ReactiveVar('');
    this.card = this.data();
    this.score = new ReactiveVar('');
  },
  
  showScore() {
    return this.score.get();
  },

  events() {
    return [{
      'submit .edit-score'(evt) {
        evt.preventDefault();
        const score = evt.target.score.value
        if (score !== '') {
          this._storeScore(score);
          Popup.close();
        } else {
            this.error.set('invalid-score');
            evt.target.date.focus();
        }
      },
      'click .js-delete-score'(evt) {
        evt.preventDefault();
        this._deleteScore();
        Popup.close();
      },
    }];
  },
});

//editCardInitialScorePopup
(class extends CardScore {
  onCreated() {
    super.onCreated();
    this.data().getInitialScore() && this.score.set(this.data().getInitialScore());
  }
  
  onRendered() {
    super.onRendered();
    this.$('.target-score').remove();
  }

  _storeScore(score) {
    this.card.setInitialScore(score);
  }

  _deleteScore() {
    this.card.setInitialScore(null);
  }
}).register('editCardInitialScorePopup');

//editCardEndScorePopup
(class extends CardScore {
  onCreated() {
    super.onCreated();
    this.data().getEndScore() && this.score.set(this.data().getEndScore());
  }
  
  onRendered() {
    super.onRendered();
    this.$('.target-score').remove();
  }

  _storeScore(score) {
    this.card.setEndScore(score);
  }

  _deleteScore() {
    this.card.setEndScore(null);
  }
}).register('editCardEndScorePopup');

//editCardCurrentScorePopup
(class extends CardScore {
  onCreated() {
    super.onCreated();
    this.data().getCurrentScore() && this.score.set(this.data().getCurrentScore());
  }
  
  onRendered() {
    super.onRendered();
    this.$('.target-score').remove();
  }

  _storeScore(score) {
    this.card.setCurrentScore(score);
    this.card.reloadHistoricScoreChart();
  }

  _deleteScore() {
    this.card.setCurrentScore(null);
  }
}).register('editCardCurrentScorePopup');

//editCardTargetScorePopup
(class extends CardScore {
  onCreated() {
    super.onCreated();
    this.data().getTargetScore() && this.score.set(this.data().getTargetScore());
    this.data().getDue() && this.date.set(moment(this.data().getDue()));
  }
  
  onRendered() {
    super.onRendered();
  }
  
  _storeScore(score) {
    this.card.setTargetScore(score);
    this.card.reloadHistoricScoreChart();
  }
  
  _storeDueDate(dueAt) {
    this.card.setDue(dueAt);
  }

  _deleteScore() {
    this.card.setTargetScore(null);
  }
}).register('editCardTargetScorePopup');

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

(class extends CardScoreForm {
  onCreated() {
    super.onCreated();
    const self = this;
    self.autorun(() => {
      self.score.set(self.data().getInitialScore());
    });
  }
  
  classes() {
    return 'card-label-silver';
  }

  events() {
    return super.events().concat({
      'click .js-edit-score': Popup.open('editCardInitialScore'),
    });
  }
}).register('cardInitialScore');

(class extends CardScoreForm {
  onCreated() {
    super.onCreated();
    const self = this;
    self.autorun(() => {
      self.score.set(self.data().getEndScore());
    });
  }
  
  classes() {
    return 'card-label-silver';
  }

  events() {
    return super.events().concat({
      'click .js-edit-score': Popup.open('editCardEndScore'),
    });
  }
}).register('cardEndScore');

(class extends CardScoreForm {
  onCreated() {
    super.onCreated();
    const self = this;
    self.autorun(() => {
      self.score.set(self.data().getCurrentScore());
    });
  }
  
  classes() {
    return 'card-label-blue';
  }
  
  events() {
    return super.events().concat({
      'click .js-edit-score': Popup.open('editCardCurrentScore'),
    });
  }
}).register('cardCurrentScore');

(class extends CardScoreForm {
  onCreated() {
    super.onCreated();
    const self = this;
    self.autorun(() => {
      self.score.set(self.data().getTargetScore());
    });
  }
  
  classes() {
    return 'card-label-green';
  }

  events() {
    return super.events().concat({
      'click .js-edit-score': Popup.open('editCardTargetScore'),
    });
  }
}).register('cardTargetScore');
