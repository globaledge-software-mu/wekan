import Inputmask from 'inputmask';
DatePicker = BlazeComponent.extendComponent({
  template() {
    return 'datepicker';
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
    }.bind(this));

    if (this.date.get().isValid()) {
      $picker.datepicker('update', this.date.get().toDate());
    }
    Inputmask('datetime', {inputFormat: moment.localeData().longDateFormat('L').toLowerCase(), placeholder: moment.localeData().longDateFormat('L')}).mask(this.$('#date'));
    Inputmask('datetime', {inputFormat: moment.localeData().longDateFormat('LT').toUpperCase(), placeholder: moment.localeData().longDateFormat('LT')}).mask(this.$('#time'));
  },

  removeTimeUI(listIdentifier, key) {
    const property = ListProperties.findOne({listId: listIdentifier, i18nKey: key});
    if (typeof property !== 'undefined') {
      let useTime = (property.hasOwnProperty('useTime')) ? property.useTime : false;
      if (useTime !== true) {
      	$('.js-time-field#time').closest('.right').remove();
      }
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
  showScore() {
    let score = '';
    if (this.score.get()) {
       score = this.score.get();
    }
    return score;
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
        const newDate = '';
        if (evt.target.time && evt.target.time.value) {
          // if no time was given, init with 23:59
          const time = evt.target.time.value || moment(new Date().setHours(23, 59, 0)).format('LT');
          const dateString = `${evt.target.date.value} ${time}`;
          newDate = moment(dateString, 'L LT', true);
        } else if (evt.target && !evt.target.time) {
          // Time is disabled, init with 23:59
          const time = moment(new Date().setHours(23, 59, 0)).format('LT');
          const dateString = `${evt.target.date.value} ${time}`;
          newDate = moment(dateString, 'L LT', true);
        } else {
          const dateString = `${evt.target.date.value}`;
          newDate = moment(dateString, 'L', true);
        }
        
        if (!newDate.isValid()) {
          this.error.set('invalid-date');
          evt.target.date.focus();
          return false;
        }
        if (typeof evt.target.score != 'undefined' && evt.target.score.value == '') {
            this.error.set('invalid-score');
            evt.target.score.focus();
            return false;
        }
        if (typeof evt.target.score != 'undefined') {
          let score = evt.target.score.value;
          score = score.replace('%', '').trim();
          if (isNaN(score)) {
            this.error.set('invalid-score');
            return false;
          }
        }
        
        this._storeDate(newDate.toDate());

        if (evt.target && evt.target.score && evt.target.score.value) {
          this._storeScore(evt.target.score.value);
        }
        Popup.close();
      },
      'click .js-delete-date'(evt) {
        evt.preventDefault();
        this._deleteDate();
        this._deleteScore();
        Popup.close();
      },
    }];
  },
});
