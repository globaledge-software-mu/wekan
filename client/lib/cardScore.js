import Inputmask from 'inputmask'

CardScore = BlazeComponent.extendComponent({
  template() {
    return 'cardScore';
  },
  
  onCreated() {
    this.error = new ReactiveVar('');
    this.card = this.data();
    this.score = new ReactiveVar('');
    this.date = new ReactiveVar(moment.invalid());
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
    Inputmask('datetime', {inputFormat: moment.localeData().longDateFormat('L').toLowerCase(), placeholder: moment.localeData().longDateFormat('L')}).mask(this.$('#date'));
    Inputmask('datetime', {inputFormat: moment.localeData().longDateFormat('LT').toUpperCase(), placeholder: moment.localeData().longDateFormat('LT')}).mask(this.$('#time'));
  },
  
  showScore() {
    return this.score.get();
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
  
  events() {
    return [{
      'submit .edit-score'(evt) {
        evt.preventDefault();
        const score = evt.target.score.value
        if (score == '') {
          this.error.set('invalid-score');
          evt.target.score.focus();
          return false;
        }
        if (typeof evt.target.date != 'undefined') {
          const time = evt.target.time.value || moment(new Date().setHours(12, 0, 0)).format('LT');
          const dateString = `${evt.target.date.value} ${time}`;
          const newDate = moment(dateString, 'L LT', true);
          if (!newDate.isValid()) {
            this.error.set('invalid-date');
            evt.target.date.focus();
            return false;
          } else {
            this._storeDueDate(newDate.toDate());
          }
        }
        this._storeScore(score);
        Popup.close();
      },
      'click .js-delete-score'(evt) {
        evt.preventDefault();
        this._deleteScore();
        Popup.close();
      },
    }]
  }
});

CardScores = BlazeComponent.extendComponent({
  template() {
    return 'cardScores';
  },

  onCreated() {
    this.error = new ReactiveVar('');
    this.card = this.data();
    this.date = new ReactiveVar(moment.invalid());
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
    Inputmask('datetime', {inputFormat: moment.localeData().longDateFormat('L').toLowerCase(), placeholder: moment.localeData().longDateFormat('L')}).mask(this.$('#date'));
    Inputmask('datetime', {inputFormat: moment.localeData().longDateFormat('LT').toUpperCase(), placeholder: moment.localeData().longDateFormat('LT')}).mask(this.$('#time'));
  },

  _storeDate(date) {
    this.card.setReceived(date);
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
      'submit .edit-card-score'(evt) {
        evt.preventDefault();

        // if no time was given, init with 12:00
        const time = evt.target.time.value || moment(new Date().setHours(12, 0, 0)).format('LT');

        const dateString = `${evt.target.date.value} ${time}`;
        const dueAt = moment(dateString, 'L LT', true);
        const currentScore = evt.target.currentScore.value;
        const targetScore = evt.target.targetScore.value;
        if (isNaN(currentScore)) {
          this.error.set('invalid-score');
          evt.target.currentScore.focus();
          return;
        }
        if (isNaN(targetScore)) {
          this.error.set('invalid-score');
          evt.target.targetScore.focus();
          return;
        }
        if (!dueAt.isValid()) {
          this.error.set('invalid-date');
          evt.target.date.focus();
          return;
        }
        this._storeScores(dueAt.toDate(), currentScore, targetScore);
        Popup.close();
      },
      'click .js-delete'(evt) {
        evt.preventDefault();
        this._delete()
        Popup.close();
      },
    }];
  }
});

  
  