// Edit received, start, due & end dates
BlazeComponent.extendComponent({
  template() {
    return 'editCardDate';
  },

  onCreated() {
    this.error = new ReactiveVar('');
    this.card = this.data();
    this.date = new ReactiveVar(moment.invalid());
    this.score = new ReactiveVar('');
  },

  onRendered() {
    const $picker = this.$('.js-datepicker').datepicker({
      todayHighlight: true,
      todayBtn: 'linked',
      language: TAPi18n.getLanguage(),
    }).on('changeDate', function(evt) {
      this.find('#date').value = moment(evt.date).format('L');
      this.error.set('');
      this.find('#time').focus();
    }.bind(this));

    if (this.date.get().isValid()) {
      $picker.datepicker('update', this.date.get().toDate());
    }
  },

  showDate() {
    if (this.date.get().isValid())
      return this.date.get().format('L');
    return '';
  },
  showTime() {
    if (this.date.get().isValid())
      return this.date.get().format('LT');
    return '';
  },
  dateFormat() {
    return moment.localeData().longDateFormat('L');
  },
  timeFormat() {
    return moment.localeData().longDateFormat('LT');
  },

  events() {
    return [{
      'keyup .js-date-field'() {
        // parse for localized date format in strict mode
        const dateMoment = moment(this.find('#date').value, 'L', true);
        if (dateMoment.isValid()) {
          this.error.set('');
          this.$('.js-datepicker').datepicker('update', dateMoment.toDate());
        }
      },
      'keyup .js-time-field'() {
        // parse for localized time format in strict mode
        const dateMoment = moment(this.find('#time').value, 'LT', true);
        if (dateMoment.isValid()) {
          this.error.set('');
        }
      },
      'submit .edit-date'(evt) {
        evt.preventDefault();

        // if no time was given, init with 12:00
        const time = evt.target.time.value || moment(new Date().setHours(12, 0, 0)).format('LT');

        const dateString = `${evt.target.date.value} ${time}`;
        const newDate = moment(dateString, 'L LT', true);
        if (newDate.isValid()) {
          this._storeDate(newDate.toDate());
          Popup.close();
        }
        else {
          this.error.set('invalid-date');
          evt.target.date.focus();
        }
      },
      'click .js-delete-date'(evt) {
        evt.preventDefault();
        this._deleteDate();
        Popup.close();
      },
    }];
  },
});

Template.dateBadge.helpers({
  canModifyCard() {
    return Meteor.user() && Meteor.user().isBoardMember() && !Meteor.user().isCommentOnly();
  },
});

// editCardReceivedDatePopup
(class extends DatePicker {
  onCreated() {
    super.onCreated();
    this.data().getReceived() && this.date.set(moment(this.data().getReceived()));
    this.data().getInitialScore() && this.score.set(this.data().getInitialScore());
  }
  
  onRendered() {
    super.onRendered();
    if (!this.data().isPropertyVisible('card-received-score-title')) {
      $('.score').remove();
    }
  }

  _storeDate(date) {
    this.card.setReceived(date);
  }
  
  _storeScore(score) {
    this.card.setInitialScore(score);
  }

  _deleteDate() {
    this.card.setReceived(null);
  }
  
  _deleteScore() {
    this.card.setInitialScore(null);
  }
}).register('editCardReceivedDatePopup');


// editCardStartDatePopup
(class extends DatePicker {
  onCreated() {
    super.onCreated();
    // The following if condition distinguishes whether the edit button was clicked directly 
    // or it was triggered from the click event of the historical chart's datapoint 
    if (!this.data().dataPointDate) {
      this.date.set(moment());
      this.data().getCurrentScore() && this.score.set(this.data().getCurrentScore());
    } else {
      this.data().getStart() && this.date.set(moment(this.data().getStart()));
      this.data().dataPointScore && this.score.set(this.data().dataPointScore);
    }
  }

  onRendered() {
    super.onRendered();
    // Set Upper Date Limit
    this.$('.js-datepicker').datepicker('setEndDate', '+0d');
    if (moment.isDate(this.card.getReceived())) {
      // Set Lower Date Limit
      this.$('.js-datepicker').datepicker('setStartDate', this.card.getReceived());
    }
    if (this.data().dataPointDate) {
      this.$('.js-datepicker').datepicker('setDate', this.card.getStart());
    } else {
      this.$('.js-datepicker').datepicker('setDate', new Date());
    }
    if (!this.data().isPropertyVisible('card-start-score-title')) {
      $('.score').remove();
    }
  }

  _storeDate(date) {
    let today = new Date();
    let tomorrow = new Date();
    tomorrow.setHours(0,0,0,0);
    tomorrow.setDate(today.getDate() + 1);
    if (date >= tomorrow) {
       this.error.set('invalid-date');
       $('.js-date-field').focus();
       return false;
    }
    this.card.setStart(date);
    var oldDate = this.data().dataPointDate;
    var oldScore = this.data().dataPointScore;
    // if clicked from chart && date changed
    if (this.data().dataPointDate && oldDate.getTime() !== date.getTime()) {
      cardScoreDoc = CardScores.findOne({cardId: this.card._id, type: 'current', score: oldScore, date: oldDate});
      CardScores.remove(cardScoreDoc._id);
    }
  }
  
  _storeScore(score) {
    if (this.error.get() !== '') {
       return false;
    }
    this.card.setCurrentScore(score);
    this.card.reloadHistoricScoreChart();
  }

  _deleteDate() {
    this.card.setStart(null);
  }
  
  _deleteScore() {
    if (typeof this.card.dataPointDate === 'undefined' || this.card.dataPointDate === null) {
      this.card.setCurrentScore(null);
    } else {
      // from chart datapoint 
      cardScoreDoc = CardScores.findOne({ date: this.card.dataPointDate, score: this.card.dataPointScore, type: 'current', cardId: this.card._id });
      CardScores.remove({ _id: cardScoreDoc._id });
      lastPastDoc = CardScores.find({ date: {$lte: new Date()}, type: 'current', cardId: this.card._id }, { sort: { date: -1 } }).fetch();
      if (lastPastDoc.length > 0) {
        lastPastStart = lastPastDoc[0].date;
        lastPastCurrentScore = lastPastDoc[0].score;
        this.card.setStart(lastPastStart);
        this.card.setCurrentScore(lastPastCurrentScore);
      } else {
        this.card.setCurrentScore(null);
      }
    }
  }
}).register('editCardStartDatePopup');

// editCardDueDatePopup
(class extends DatePicker {
  onCreated() {
    super.onCreated();
    // The following if condition distinguishes whether the edit button was clicked directly 
    // or it was triggered from the click event of the historical chart's datapoint 
    if (!this.data().dataPointDate) {
      this.data().getTargetScore() && this.score.set(this.data().getTargetScore());
    } else {
      this.data().getDue() && this.date.set(moment(this.data().getDue()));
      this.data().dataPointScore && this.score.set(this.data().dataPointScore);
    }
  }

  onRendered() {
    super.onRendered();
    if (moment.isDate(this.card.getStart())) {
      // Set Lower Date Limit
      this.$('.js-datepicker').datepicker('setStartDate', this.card.getStart());
    }
    if (this.data().dataPointDate) {
      this.$('.js-datepicker').datepicker('setDate', this.card.getDue());
    }
    if (!this.data().isPropertyVisible('card-due-score-title')) {
      $('.score').remove();
    }
  }

  _storeDate(date) {
    this.card.setDue(date);
    var oldDate = this.data().dataPointDate;
    var oldScore = this.data().dataPointScore;
    // if clicked from chart && date changed
    if (this.data().dataPointDate && oldDate.getTime() !== date.getTime()) {
      cardScoreDoc = CardScores.findOne({cardId: this.card._id, type: 'target', score: oldScore, date: oldDate});
      CardScores.remove(cardScoreDoc._id);
    }
  }
  
  _storeScore(score) {
    this.card.setTargetScore(score);
    this.card.reloadHistoricScoreChart();
  }

  _deleteDate() {
    this.card.setDue(null);
  }
  
  _deleteScore() {
    if (typeof this.card.dataPointDate === 'undefined' || this.card.dataPointDate === null) {
      this.card.setTargetScore(null);
    } else {
      // from chart datapoint 
      cardScoreDoc = CardScores.findOne({ date: this.card.dataPointDate, score: this.card.dataPointScore, type: 'target', cardId: this.card._id });
      CardScores.remove({ _id: cardScoreDoc._id });
      firstFutureDoc = CardScores.find({ date: {$gte: new Date(new Date().getDate()-1)}, type: 'target', cardId: this.card._id }, { sort: { date: 1 } }).fetch();
      if (firstFutureDoc.length > 0) {
        firstFutureDue = firstFutureDoc[0].date;
        firstFutureTargetScore = firstFutureDoc[0].score;
        this.card.setDue(firstFutureDue);
        this.card.setTargetScore(firstFutureTargetScore);
      } else {
        this.card.setTargetScore(null);
      }
    }
  }
}).register('editCardDueDatePopup');

// editCardEndDatePopup
(class extends DatePicker {
  onCreated() {
    super.onCreated();
    this.data().getEnd() && this.date.set(moment(this.data().getEnd()));
    this.data().getEndScore() && this.score.set(this.data().getEndScore());
  }

  onRendered() {
    super.onRendered();
    if (moment.isDate(this.card.getStart())) {
      // Set Lower Date Limit
      this.$('.js-datepicker').datepicker('setStartDate', this.card.getStart());
    }
    if (!this.data().isPropertyVisible('card-end-score-title')) {
      $('.score').remove();
    }
  }

  _storeDate(date) {
    this.card.setEnd(date);
  }
  
  _storeScore(score) {
    this.card.setEndScore(score);
  }

  _deleteDate() {
    this.card.setEnd(null);
  }
  
  _deleteScore() {
    this.card.setEndScore(null);
  }
}).register('editCardEndDatePopup');


// Display received, start, due & end dates
const CardDate = BlazeComponent.extendComponent({
  template() {
    return 'dateBadge';
  },

  onCreated() {
    const self = this;
    self.date = ReactiveVar();
    self.now = ReactiveVar(moment());
    window.setInterval(() => {
      self.now.set(moment());
    }, 60000);
  },

  showDate() {
    // this will start working once mquandalle:moment
    // is updated to at least moment.js 2.10.5
    // until then, the date is displayed in the "L" format
    return this.date.get().calendar(null, {
      sameElse: 'llll',
    });
  },

  showISODate() {
    return this.date.get().toISOString();
  },
});

class CardReceivedDate extends CardDate {
  onCreated() {
    super.onCreated();
    const self = this;
    self.autorun(() => {
      self.date.set(moment(self.data().getReceived()));
    });
  }

  classes() {
    let classes = 'received-date ';
    const dueAt = this.data().getDue();
    const endAt = this.data().getEnd();
    const startAt = this.data().getStart();
    const theDate = this.date.get();
    // if dueAt, endAt and startAt exist & are > receivedAt, receivedAt doesn't need to be flagged
    if (((startAt) && (theDate.isAfter(dueAt))) ||
       ((endAt) && (theDate.isAfter(endAt))) ||
       ((dueAt) && (theDate.isAfter(dueAt))))
      classes += 'long-overdue';
    else
      classes += 'current';
    //Overridden by Invessel
    let property = this.data().list().getProperty('card-received');
    if (property !== null && !property.useDateWarnings) {
      return 'received-date card-label-' + property.color + ' date';
    }
    return classes;
  }

  showTitle() {
    return `${TAPi18n.__('card-received-on')} ${this.date.get().format('LLLL')}`;
  }

  events() {
    return super.events().concat({
      'click .js-edit-date': Popup.open('editCardReceivedDate'),
    });
  }
}
CardReceivedDate.register('cardReceivedDate');

class CardStartDate extends CardDate {
  onCreated() {
    super.onCreated();
    const self = this;
    self.autorun(() => {
      self.date.set(moment(self.data().getStart()));
    });
  }

  classes() {
    let classes = 'start-date' + ' ';
    const dueAt = this.data().getDue();
    const endAt = this.data().getEnd();
    const theDate = this.date.get();
    const now = this.now.get();
    // if dueAt or endAt exist & are > startAt, startAt doesn't need to be flagged
    if (((endAt) && (theDate.isAfter(endAt))) ||
       ((dueAt) && (theDate.isAfter(dueAt))))
      classes += 'long-overdue';
    else if (theDate.isBefore(now, 'minute'))
      classes += 'almost-due';
    else
      classes += 'current';
    //Overridden by Invessel
    let property = this.data().list().getProperty('card-start');
    if (property !== null && !property.useDateWarnings) {
      return 'start-date card-label-' + property.color + ' date';
    }
    return classes;
  }

  showTitle() {
    return `${TAPi18n.__('card-start-on')} ${this.date.get().format('LLLL')}`;
  }

  events() {
    return super.events().concat({
      'click .js-edit-date': Popup.open('editCardStartDate'),
    });
  }
}
CardStartDate.register('cardStartDate');

class CardDueDate extends CardDate {
  onCreated() {
    super.onCreated();
    const self = this;
    self.autorun(() => {
      self.date.set(moment(self.data().getDue()));
    });
  }

  classes() {
    let classes = 'due-date' + ' ';
    const endAt = this.data().getEnd();
    const theDate = this.date.get();
    const now = this.now.get();
    // if the due date is after the end date, green - done early
    if ((endAt) && (theDate.isAfter(endAt)))
      classes += 'current';
    // if there is an end date, don't need to flag the due date
    else if (endAt)
      classes += '';
    else if (now.diff(theDate, 'days') >= 2)
      classes += 'long-overdue';
    else if (now.diff(theDate, 'minute') >= 0)
      classes += 'due';
    else if (now.diff(theDate, 'days') >= -1)
      classes += 'almost-due';
    //Overridden by Invessel
    let property = this.data().list().getProperty('card-due');
    if (property !== null && (!property.useDateWarnings || classes.trim() === 'due-date')) {
      return 'due-date card-label-' + property.color + ' date';
    }
    return classes;
  }

  showTitle() {
    return `${TAPi18n.__('card-due-on')} ${this.date.get().format('LLLL')}`;
  }

  events() {
    return super.events().concat({
      'click .js-edit-date': Popup.open('editCardDueDate'),
    });
  }
}
CardDueDate.register('cardDueDate');

class CardEndDate extends CardDate {
  onCreated() {
    super.onCreated();
    const self = this;
    self.autorun(() => {
      self.date.set(moment(self.data().getEnd()));
    });
  }

  classes() {
    let classes = 'end-date' + ' ';
    const dueAt = this.data().getDue();
    const theDate = this.date.get();
    if (theDate.diff(dueAt, 'days') >= 2)
      classes += 'long-overdue';
    else if (theDate.diff(dueAt, 'days') >= 0)
      classes += 'due';
    else if (theDate.diff(dueAt, 'days') >= -2)
      classes += 'almost-due';
    //Overridden by Invessel
    let property = this.data().list().getProperty('card-end');
    if (property !== null && !property.useDateWarnings) {
      return 'end-date card-label-' + property.color + ' date';
    }
    return classes;
  }

  showTitle() {
    return `${TAPi18n.__('card-end-on')} ${this.date.get().format('LLLL')}`;
  }

  events() {
    return super.events().concat({
      'click .js-edit-date': Popup.open('editCardEndDate'),
    });
  }
}
CardEndDate.register('cardEndDate');

(class extends CardReceivedDate {
  showDate() {
    return this.date.get().format('DD/MM')
  }
}).register('minicardReceivedDate');

(class extends CardStartDate {
  showDate() {
    return this.date.get().format('DD/MM');
  }
}).register('minicardStartDate');

(class extends CardDueDate {
  showDate() {
    return this.date.get().format('DD/MM');
  }
}).register('minicardDueDate');

(class extends CardEndDate {
  showDate() {
    return this.date.get().format('DD/MM');
  }
}).register('minicardEndDate');
