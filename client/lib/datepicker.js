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


      'click #score'(evt) {
        const formTitle = $(evt.currentTarget).closest('.content-wrapper').siblings('.header').find('.header-title').text();
        if (formTitle === TAPi18n.__('editCardReceivedDatePopup-title') || formTitle === TAPi18n.__('editCardStartDatePopup-title') || formTitle === TAPi18n.__('editCardDueDatePopup-title')) {
          const cardId = this.card._id;
          var hasAspects = false;
          var hasTeamMembers = false;

          const aspects = AspectsListItems.find({ cardId });
          if (aspects.count() > 0) {
            hasAspects = true;
          }

          const actualCard = Cards.findOne({ _id: cardId });
          if (actualCard && actualCard.team_members && actualCard.team_members.length > 0) {
            hasTeamMembers = true;
          }

          // if is from chart, do not open composed score modal
          if (typeof this.card.dataPointDate !== 'undefined' && this.card.dataPointDate !== null) {
            return false;
          }

          if ($('#date').val() !== "") {
          	if (hasAspects || hasTeamMembers) {
              var newDate = '';
              var dateString = '';
              if ($('#time').length > 0) {
                // if no time was given, init with 23:59
                const time = $('#time').val() || moment(new Date().setHours(23, 59, 0)).format('LT');
                dateString = $('#date').val() + ' ' + time;
                newDate = moment(dateString, 'L LT', true);
              } else if ($('#time').length < 1) {
                // Time is disabled, init with 23:59
                const time = moment(new Date().setHours(23, 59, 0)).format('LT');
                dateString = $('#date').val() + ' ' + time;
                newDate = moment(dateString, 'L LT', true);
              }
              if (!newDate.isValid()) {
                this.error.set('invalid-date');
                $('#date').focus();
                return false;
              }

              Session.set('dateString', dateString);
              Popup.close();

              if (formTitle === TAPi18n.__('editCardReceivedDatePopup-title')) {
                Modal.open('editCardReceivedComposedScoreModal');
                Session.set('composedReceivedScoreCardId', cardId);
              } else if (formTitle === TAPi18n.__('editCardStartDatePopup-title')) {
                Modal.open('editCardStartComposedScoreModal');
                Session.set('composedStartScoreCardId', cardId);
              } else if (formTitle === TAPi18n.__('editCardDueDatePopup-title')) {
                Modal.open('editCardDueComposedScoreModal');
                Session.set('composedDueScoreCardId', cardId);
              }
          	}
          } else {
            this.error.set('invalid-date');
            $('#date').focus();
            return false;
          }
        } else {
          return false;
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
        let textMessage = '';
        let clickedDatapoint = false;
        var datapointParams = {};
        const formTitle = $('.js-delete-date').closest('.content-wrapper').siblings('.header').find('.header-title').text();
        if (formTitle === TAPi18n.__('editCardStartDatePopup-title') || formTitle === TAPi18n.__('editCardDueDatePopup-title')) {
          if (typeof this.card.dataPointDate === 'undefined' || this.card.dataPointDate === null) { // from the date/score badge
          	textMessage = 'This will delete only the date & score in the badge!';
          } else { // from one of the chart datapoints
          	textMessage = 'This will delete the clicked date & score in the history chart and if the same date & score are on the badge, that too shall get deleted!';
          	clickedDatapoint = true;
          	datapointParams['dataPointDate'] = this.card.dataPointDate;
          	datapointParams['dataPointScore'] = this.card.dataPointScore;
          }
        } else {
        	textMessage = 'This will delete the date & score!';
        }

        Popup.close();

        swal({
          title: 'Confirm deletion?',
          text: textMessage,
          icon: 'warning',
          buttons: [true, 'Yes'],
          dangerMode: true,
        })
        .then((okDelete) => {
          if (okDelete) {
            this._deleteDate();
            this._deleteScore(clickedDatapoint, datapointParams);
          } else {
            return false;
          }
        });
      },

    }];
  },
});
