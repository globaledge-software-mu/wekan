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

        // if no time was given, init with 23:59
        const time = evt.target.time.value || moment(new Date().setHours(23, 59, 0)).format('LT');
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

    //Remove 'Time' from UI if not selected in list properties for the Alias of Name 'Received'
    var listId = this.data().list()._id;
    this.removeTimeUI(listId, 'card-received');
  }

  // store received date
  _storeDate(date) {
  	// If start is not set yet, set it too
  	const startDate = this.data().getStart();
  	if (!startDate || startDate.length < 1 || startDate == '') {
  		this.card.setStart(date);
  	}
    this.card.setReceived(date);
  }

  // store initial score
  _storeScore(score, date) {
  	// If CurrentScore is not set yet, set it too
  	const currentScore = this.data().getCurrentScore();
  	if (!currentScore || currentScore.length < 1 || currentScore == '') {
  		this.card.setCurrentScore(score);
  	}
    this.card.setInitialScore(score);
  }

  _deleteDate() {
    this.card.setReceived(null);
  }

  _deleteScore(clickedDatapoint, datapointParams) {
    this.card.setInitialScore(null);
  }

  // Do not add event handlers here, it will breakup the score saving ability,
  // all the event handlers are to found on the page datepicker.js from client/lib/datepicker.js

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

    //Remove 'Time' from UI if not selected in list properties for the Alias of Name 'Start'
    var listId = this.data().list()._id;
    this.removeTimeUI(listId, 'card-start');
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
      if (typeof cardScoreDoc !== 'undefined') {
        CardScores.remove({_id: cardScoreDoc._id});
      }
    }
  }

  //store current score
  _storeScore(score) {
    this.card.setCurrentScore(score);
  	// If initial is not set yet, set it too
  	const initialScore = this.data().getInitialScore();
  	if (!initialScore || initialScore.length < 1 || initialScore == '') {
  		this.card.setInitialScore(score);
  	}
  	this.card.reloadHistoricScoreChart();
  }

  _deleteDate() {
    this.card.setStart(null);
  }

  _deleteScore(clickedDatapoint, datapointParams) {
    if (!clickedDatapoint) {
      this.card.setCurrentScore(null);
    } else {
      // from chart datapoint
      cardScoreDoc = CardScores.findOne({
      	date: datapointParams.dataPointDate,
      	score: datapointParams.dataPointScore,
      	type: 'current',
      	cardId: this.card._id
    	});
      if (typeof cardScoreDoc !== 'undefined') {
        CardScores.remove({_id: cardScoreDoc._id});
      }
      this.card.setCurrentScore(null);
    }
  }

  // Do not add event handlers here, it will breakup the score saving ability,
  // all the event handlers are to found on the page datepicker.js from client/lib/datepicker.js

}).register('editCardStartDatePopup');

// editCardDueDatePopup
(class extends DatePicker {
  onCreated() {
    super.onCreated();
    // The following if condition distinguishes whether the edit button was clicked directly
    // or it was triggered from the click event of the historical chart's datapoint
    if (!this.data().dataPointDate) {
      this.data().getDue() && this.date.set(moment(this.data().getDue()));
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

    //Remove 'Time' from UI if not selected in list properties for the Alias of Name 'Due'
    var listId = this.data().list()._id;
    this.removeTimeUI(listId, 'card-due');
  }

  _storeDate(date) {
    this.card.setDue(date);
    var oldDate = this.data().dataPointDate;
    var oldScore = this.data().dataPointScore;
    // if clicked from chart && date changed
    if (this.data().dataPointDate && oldDate.getTime() !== date.getTime()) {
      cardScoreDoc = CardScores.findOne({cardId: this.card._id, type: 'target', score: oldScore, date: oldDate});
      if (typeof cardScoreDoc !== 'undefined') {
        CardScores.remove({_id: cardScoreDoc._id});
      }
    }
  }

  _storeScore(score) {
    this.card.setTargetScore(score);
    this.card.reloadHistoricScoreChart();
  }

  _deleteDate() {
    this.card.setDue(null);
  }

  _deleteScore(clickedDatapoint, datapointParams) {
    if (!clickedDatapoint) { // from badge
      this.card.setTargetScore(null);
    } else { // from chart datapoint
      cardScoreDoc = CardScores.findOne({
      	date: datapointParams.dataPointDate,
      	score: datapointParams.dataPointScore,
      	type: 'target',
      	cardId: this.card._id
    	});
      if (typeof cardScoreDoc !== 'undefined') {
        CardScores.remove({_id: cardScoreDoc._id});
      }
      this.card.setTargetScore(null);
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

    //Remove 'Time' from UI if not selected in list properties for the Alias of Name 'End'
    var listId = this.data().list()._id;
    this.removeTimeUI(listId, 'card-end');
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

  _deleteScore(clickedDatapoint, datapointParams) {
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

  // this method is ran only when a minicard is opened and has any received or start or due or end date
  // and when received or start or due or end date gets edited
  showDate(key) {
  	const listIdentifier = this.data().list()._id;
    const property = ListProperties.findOne({listId: listIdentifier, i18nKey: key});
    // If Time is disabled, we extract the default time from the text to be displayed
    if (property && !property.useTime) {
      return (this.date.get().calendar(null, {
      	lastDay : '[Yesterday]',
        sameDay : '[Today]',
        nextDay : '[Tomorrow]',
        lastWeek : '[last]',
        nextWeek : '[Next]',
        sameElse : 'llll',
      }).split(" at"))[0];
    } else {
      return this.date.get().calendar(null, {
        sameElse: 'llll',
      });
    }
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

  distinguishDate() {
  	return 'card-received';
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

  distinguishDate() {
  	return 'card-start';
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

  distinguishDate() {
  	return 'card-due';
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

  distinguishDate() {
  	return 'card-end';
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

BlazeComponent.extendComponent({
  onCreated() {
    //
  },

  onRendered() {
    //
  },

  events() {
    return [{
    	'click #submitDetailedInitialScores'(e) {
        e.preventDefault();

        const cardId = Session.get('composedReceivedScoreCardId');
        const card = Cards.findOne({ _id: cardId });
        if (card && card._id) {
          const receivedScoreComposeMethod = $('.receivedScoreComposeMethod:checked').val();
          if (receivedScoreComposeMethod === 'average') {
            Cards.update(
              { _id: cardId },
              { $set: {
                choseAverageReceived: true
              } }
            );
          } else if (receivedScoreComposeMethod === 'addition') {
            Cards.update(
              { _id: cardId },
              { $set: {
                choseAverageReceived: false
              } }
            );
          }

          const dateString = Session.get('dateString');
          const date = moment(dateString, 'L LT', true).toDate();

          var hasOnlyAspects = false;
          var hasOnlyTeamMembers = false;
          var hasBothTeamMembersAndAspects = false;

          const hasAspects = $('.aspects-score-input').length;
          const hasTeamMembers = $('.team-members-score-input').length;
          const hasTeamMembersAspects = $('.team-members-aspects-score-input').length;

          if (hasAspects > 0) {
            hasOnlyAspects = true;
          }
          if (hasTeamMembersAspects < 1 && hasTeamMembers > 0) {
            hasOnlyTeamMembers = true;
          }
          if (hasTeamMembersAspects > 0) {
            hasBothTeamMembersAndAspects = true;
          }

          // Has only Aspects
          if (hasOnlyAspects) {
            $('.aspects-score-input').each(function() {
              const aspectId = $(this).attr('id');
              var valueSet = $(this).val();
              const aspectDoc = AspectsListItems.findOne({ _id: aspectId });
              if (aspectDoc && aspectDoc._id) {
                AspectsListItems.update(
                  { _id: aspectDoc._id },
                  { $set: {
                    initialScore: valueSet,
                  } }
                );
              }
            });

            const aspectsDocs = AspectsListItems.find({ cardId });
            if (aspectsDocs.count() > 0) {
              var aspectsTotalScore = 0;
              aspectsDocs.forEach((doc) => {
                const aspectInitialScore = parseFloat(doc.initialScore);
                if (aspectInitialScore > 0) {
                  aspectsTotalScore += aspectInitialScore;
                }
              });

              const composedScore = aspectsTotalScore;
              if (receivedScoreComposeMethod === 'average') {
                composedScore = aspectsTotalScore / aspectsDocs.count();
              }

              // If CurrentScore is not set yet, set it too
              const currentScore = card.getCurrentScore();
              if (!currentScore || currentScore.length < 1 || currentScore == '') {
                card.setCurrentScore(composedScore.toFixed(2).toString());
              }
              card.setInitialScore(composedScore.toFixed(2).toString());
              card.reloadHistoricScoreChart();
              Modal.close('editCardReceivedComposedScoreModal');
            }
          }

          // Has only Team-Members
          if (hasOnlyTeamMembers) {
            $('.team-members-score-input').each(function() {
              const userId = $(this).attr('id');
              var valueSet = $(this).val();
              const teamMemberScore = TeamMembersScores.findOne({ cardId, userId });
              if (teamMemberScore && teamMemberScore._id) {
                TeamMembersScores.update(
                  { _id: teamMemberScore._id },
                  { $set: {
                    initialScore: valueSet,
                  } }
                );
              }
            });

            const teamMembersScores = TeamMembersScores.find({ cardId });
            if (teamMembersScores.count() > 0) {
              var teamMembersTotalScore = 0;
              teamMembersScores.forEach((doc) => {
                const team_member_score = parseFloat(doc.initialScore);
                if (team_member_score > 0) {
                  teamMembersTotalScore += team_member_score;
                }
              });

              const composedScore = teamMembersTotalScore;
              if (receivedScoreComposeMethod === 'average') {
                composedScore = teamMembersTotalScore / teamMembersScores.count();
              }

              // If CurrentScore is not set yet, set it too
              const currentScore = card.getCurrentScore();
              if (!currentScore || currentScore.length < 1 || currentScore == '') {
                card.setCurrentScore(composedScore.toFixed(2).toString());
              }
              card.setInitialScore(composedScore.toFixed(2).toString());
              card.reloadHistoricScoreChart();
              Modal.close('editCardReceivedComposedScoreModal');
            }
          }

          // Has both Team-Members & Aspects
          if (hasBothTeamMembersAndAspects) {
            $('.team-members-aspects-score-input').each(function() {
              const teamMembersAspectsId = $(this).attr('id');
              var valueSet = $(this).val();
              TeamMembersAspects.update(
                { _id: teamMembersAspectsId },
                { $set: {
                  initialScore: valueSet,
                } }
              );
            });

            $('.team-members-score-input').each(function() {
              const userId = $(this).attr('id');
              var teamMemberTotalAspectsInitialScores = 0;
              const teamMemberAspects = TeamMembersAspects.find({ userId, cardId });
              if (teamMemberAspects.count() > 0) {
                teamMemberAspects.forEach((teamMemberAspect) => {
                  var initialScore = parseFloat(teamMemberAspect.initialScore);
                  if (initialScore > 0) {
                    teamMemberTotalAspectsInitialScores += initialScore;
                  }
                });

                const teamMemberScore = TeamMembersScores.findOne({ cardId, userId });
                if (teamMemberScore && teamMemberScore._id) {
                  TeamMembersScores.update(
                    { _id: teamMemberScore._id },
                    { $set: {
                      initialScore: teamMemberTotalAspectsInitialScores.toFixed(2).toString(),
                    } }
                  );

                  const teamMembersScores = TeamMembersScores.find({ cardId });
                  if (teamMembersScores.count() > 0) {
                    var teamMembersTotalScore = 0;
                    teamMembersScores.forEach((doc) => {
                      const team_member_score = parseFloat(doc.initialScore);
                      if (team_member_score > 0) {
                        teamMembersTotalScore += team_member_score;
                      }
                    });

                    const composedScore = teamMembersTotalScore;
                    if (receivedScoreComposeMethod === 'average') {
                      composedScore = teamMembersTotalScore / teamMembersScores.count();
                    }

                    // If CurrentScore is not set yet, set it too
                    const currentScore = card.getCurrentScore();
                    if (!currentScore || currentScore.length < 1 || currentScore == '') {
                      card.setCurrentScore(composedScore);
                    }
                    card.setInitialScore(composedScore);
                    card.reloadHistoricScoreChart();
                    Modal.close('editCardReceivedComposedScoreModal');
                  }
                }
              }
            });
          }
        }
      },
    }];
  },
}).register('editCardReceivedComposedScoreModal');

Template.editCardReceivedComposedScoreModal.helpers({
  choseAverage() {
    const cardId = Session.get('composedReceivedScoreCardId');
    const actualCard = Cards.findOne({ _id: cardId });
    if (actualCard && actualCard._id && actualCard.choseAverageReceived && actualCard.choseAverageReceived === true) {
      return true;
    } else {
      return false;
    }
  },

  hasOnlyAspects() {
    const cardId = Session.get('composedReceivedScoreCardId');
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

    if (hasAspects && !hasTeamMembers) {
      return true;
    } else {
      return false;
    }
  },

  hasOnlyTeamMembers() {
    const cardId = Session.get('composedReceivedScoreCardId');
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

    if (hasTeamMembers && !hasAspects) {
      return true;
    } else {
      return false;
    }
  },

  hasBothTeamMembersAndAspects() {
    const cardId = Session.get('composedReceivedScoreCardId');
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

    if (hasAspects && hasTeamMembers) {
      return true;
    } else {
      return false;
    }
  },

  aspects() {
    const cardId = Session.get('composedReceivedScoreCardId');
    return AspectsListItems.find({ cardId });
  },

  teamMembers() {
    const cardId = Session.get('composedReceivedScoreCardId');
    const actualCard = Cards.findOne({ _id: cardId });
    if (actualCard && actualCard.team_members && actualCard.team_members.length > 0) {
      return Users.find({_id: {$in: actualCard.team_members}});
    }
  },

  teamMemberScore(userId) {
    const cardId = Session.get('composedReceivedScoreCardId');
    const teamMemberScore = TeamMembersScores.findOne({ cardId, userId });
    if (teamMemberScore && teamMemberScore._id) {
      return teamMemberScore.initialScore;
    }
  },

  teamMemberAspects(userId) {
    const cardId = Session.get('composedReceivedScoreCardId');
    return TeamMembersAspects.find({ cardId, userId });
  },

  teamMemberAspectTitle(teamMembersAspectsId) {
    const teamMemberAspect = TeamMembersAspects.findOne({ _id: teamMembersAspectsId });
    if (teamMemberAspect && teamMemberAspect._id) {
      const cardId = Session.get('composedReceivedScoreCardId');
      const aspect = AspectsListItems.findOne({ cardId, _id: teamMemberAspect.aspectsId });
      if (aspect && aspect._id) {
        return aspect.title;
      }
    }
  },
});


BlazeComponent.extendComponent({
  onCreated() {
    //
  },

  onRendered() {
    //
  },

  events() {
    return [{
    	'click #submitDetailedCurrentScores'(e) {
        e.preventDefault();

        const cardId = Session.get('composedStartScoreCardId');
        const card = Cards.findOne({ _id: cardId });
        if (card && card._id) {
          const startScoreComposeMethod = $('.startScoreComposeMethod:checked').val();
          if (startScoreComposeMethod === 'average') {
            Cards.update(
              { _id: cardId },
              { $set: {
                choseAverageStart: true
              } }
            );
          } else if (startScoreComposeMethod === 'addition') {
            Cards.update(
              { _id: cardId },
              { $set: {
                choseAverageStart: false
              } }
            );
          }

          const dateString = Session.get('dateString');
          const date = moment(dateString, 'L LT', true).toDate();

          var hasOnlyAspects = false;
          var hasOnlyTeamMembers = false;
          var hasBothTeamMembersAndAspects = false;

          const hasAspects = $('.aspects-score-input').length;
          const hasTeamMembers = $('.team-members-score-input').length;
          const hasTeamMembersAspects = $('.team-members-aspects-score-input').length;

          if (hasAspects > 0) {
            hasOnlyAspects = true;
          }
          if (hasTeamMembersAspects < 1 && hasTeamMembers > 0) {
            hasOnlyTeamMembers = true;
          }
          if (hasTeamMembersAspects > 0) {
            hasBothTeamMembersAndAspects = true;
          }

          // Has only Aspects
          if (hasOnlyAspects) {
            $('.aspects-score-input').each(function() {
              const aspectId = $(this).attr('id');
              var valueSet = $(this).val();
              const aspectDoc = AspectsListItems.findOne({ _id: aspectId });
              if (aspectDoc && aspectDoc._id) {
                AspectsListItems.update(
                  { _id: aspectDoc._id },
                  { $set: {
                    currentScore: valueSet,
                  } }
                );
              }
            });

            const aspectsDocs = AspectsListItems.find({ cardId });
            if (aspectsDocs.count() > 0) {
              var aspectsTotalScore = 0;
              aspectsDocs.forEach((doc) => {
                const aspectCurrentScore = parseFloat(doc.currentScore);
                if (aspectCurrentScore > 0) {
                  aspectsTotalScore += aspectCurrentScore;
                }
              });

              const composedScore = aspectsTotalScore;
              if (startScoreComposeMethod === 'average') {
                composedScore = aspectsTotalScore / aspectsDocs.count();
              }

              // If initial is not set yet, set it too
              const initialScore = card.getInitialScore();
              if (!initialScore || initialScore.length < 1 || initialScore == '') {
                card.setInitialScore(composedScore.toFixed(2).toString());
              }
              card.setStart(date);
              card.setCurrentScore(composedScore.toFixed(2).toString());
              card.reloadHistoricScoreChart();
              Modal.close('editCardStartComposedScoreModal');
            }
          }

          // Has only Team-Members
          if (hasOnlyTeamMembers) {
            $('.team-members-score-input').each(function() {
              const userId = $(this).attr('id');
              var valueSet = $(this).val();
              const teamMemberScore = TeamMembersScores.findOne({ cardId, userId });
              if (teamMemberScore && teamMemberScore._id) {
                TeamMembersScores.update(
                  { _id: teamMemberScore._id },
                  { $set: {
                    currentScore: valueSet,
                  } }
                );
              }
            });

            const teamMembersScores = TeamMembersScores.find({ cardId });
            if (teamMembersScores.count() > 0) {
              var teamMembersTotalScore = 0;
              teamMembersScores.forEach((doc) => {
                const team_member_score = parseFloat(doc.currentScore);
                if (team_member_score > 0) {
                  teamMembersTotalScore += team_member_score;
                }
              });

              const composedScore = teamMembersTotalScore;
              if (startScoreComposeMethod === 'average') {
                composedScore = teamMembersTotalScore / teamMembersScores.count();
              }

              // If initial is not set yet, set it too
              const initialScore = card.getInitialScore();
              if (!initialScore || initialScore.length < 1 || initialScore == '') {
                card.setInitialScore(composedScore.toFixed(2).toString());
              }
              card.setStart(date);
              card.setCurrentScore(composedScore.toFixed(2).toString());
              card.reloadHistoricScoreChart();
              Modal.close('editCardStartComposedScoreModal');
            }
          }

          // Has both Team-Members & Aspects
          if (hasBothTeamMembersAndAspects) {
            $('.team-members-aspects-score-input').each(function() {
              const teamMembersAspectsId = $(this).attr('id');
              var valueSet = $(this).val();
              TeamMembersAspects.update(
                { _id: teamMembersAspectsId },
                { $set: {
                  currentScore: valueSet,
                } }
              );
            });

            $('.team-members-score-input').each(function() {
              const userId = $(this).attr('id');
              var teamMemberTotalAspectsCurrentScores = 0;
              const teamMemberAspects = TeamMembersAspects.find({ userId, cardId });
              if (teamMemberAspects.count() > 0) {
                teamMemberAspects.forEach((teamMemberAspect) => {
                  var currentScore = parseFloat(teamMemberAspect.currentScore);
                  if (currentScore > 0) {
                    teamMemberTotalAspectsCurrentScores += currentScore;
                  }
                });

                const teamMemberScore = TeamMembersScores.findOne({ cardId, userId });
                if (teamMemberScore && teamMemberScore._id) {
                  TeamMembersScores.update(
                    { _id: teamMemberScore._id },
                    { $set: {
                      currentScore: teamMemberTotalAspectsCurrentScores.toFixed(2).toString(),
                    } }
                  );

                  const teamMembersScores = TeamMembersScores.find({ cardId });
                  if (teamMembersScores.count() > 0) {
                    var teamMembersTotalScore = 0;
                    teamMembersScores.forEach((doc) => {
                      const team_member_score = parseFloat(doc.currentScore);
                      if (team_member_score > 0) {
                        teamMembersTotalScore += team_member_score;
                      }
                    });

                    const composedScore = teamMembersTotalScore;
                    if (startScoreComposeMethod === 'average') {
                      composedScore = teamMembersTotalScore / teamMembersScores.count();
                    }

                    // If initial is not set yet, set it too
                    const initialScore = card.getInitialScore();
                    if (!initialScore || initialScore.length < 1 || initialScore == '') {
                      card.setInitialScore(composedScore);
                    }
                    card.setStart(date);
                    card.setCurrentScore(composedScore);
                    card.reloadHistoricScoreChart();
                    Modal.close('editCardStartComposedScoreModal');
                  }
                }
              }
            });
          }
        }
      },
    }];
  },
}).register('editCardStartComposedScoreModal');

Template.editCardStartComposedScoreModal.helpers({
  choseAverage() {
    const cardId = Session.get('composedStartScoreCardId');
    const actualCard = Cards.findOne({ _id: cardId });
    if (actualCard && actualCard._id && actualCard.choseAverageStart && actualCard.choseAverageStart === true) {
      return true;
    } else {
      return false;
    }
  },

  hasOnlyAspects() {
    const cardId = Session.get('composedStartScoreCardId');
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

    if (hasAspects && !hasTeamMembers) {
      return true;
    } else {
      return false;
    }
  },

  hasOnlyTeamMembers() {
    const cardId = Session.get('composedStartScoreCardId');
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

    if (hasTeamMembers && !hasAspects) {
      return true;
    } else {
      return false;
    }
  },

  hasBothTeamMembersAndAspects() {
    const cardId = Session.get('composedStartScoreCardId');
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

    if (hasAspects && hasTeamMembers) {
      return true;
    } else {
      return false;
    }
  },

  aspects() {
    const cardId = Session.get('composedStartScoreCardId');
    return AspectsListItems.find({ cardId });
  },

  teamMembers() {
    const cardId = Session.get('composedStartScoreCardId');
    const actualCard = Cards.findOne({ _id: cardId });
    if (actualCard && actualCard.team_members && actualCard.team_members.length > 0) {
      return Users.find({_id: {$in: actualCard.team_members}});
    }
  },

  teamMemberScore(userId) {
    const cardId = Session.get('composedStartScoreCardId');
    const teamMemberScore = TeamMembersScores.findOne({ cardId, userId });
    if (teamMemberScore && teamMemberScore._id) {
      return teamMemberScore.currentScore;
    }
  },

  teamMemberAspects(userId) {
    const cardId = Session.get('composedStartScoreCardId');
    return TeamMembersAspects.find({ cardId, userId });
  },

  teamMemberAspectTitle(teamMembersAspectsId) {
    const teamMemberAspect = TeamMembersAspects.findOne({ _id: teamMembersAspectsId });
    if (teamMemberAspect && teamMemberAspect._id) {
      const cardId = Session.get('composedStartScoreCardId');
      const aspect = AspectsListItems.findOne({ cardId, _id: teamMemberAspect.aspectsId });
      if (aspect && aspect._id) {
        return aspect.title;
      }
    }
  },
});


BlazeComponent.extendComponent({
  onCreated() {
    //
  },

  onRendered() {
    //
  },

  events() {
    return [{
    	'click #submitDetailedTargetScores'(e) {
        e.preventDefault();

        const cardId = Session.get('composedDueScoreCardId');
        const card = Cards.findOne({ _id: cardId });
        if (card && card._id) {
          const dueScoreComposeMethod = $('.dueScoreComposeMethod:checked').val();
          if (dueScoreComposeMethod === 'average') {
            Cards.update(
              { _id: cardId },
              { $set: {
                choseAverageDue: true
              } }
            );
          } else if (dueScoreComposeMethod === 'addition') {
            Cards.update(
              { _id: cardId },
              { $set: {
                choseAverageDue: false
              } }
            );
          }

          const dateString = Session.get('dateString');
          const date = moment(dateString, 'L LT', true).toDate();

          var hasOnlyAspects = false;
          var hasOnlyTeamMembers = false;
          var hasBothTeamMembersAndAspects = false;

          const hasAspects = $('.aspects-score-input').length;
          const hasTeamMembers = $('.team-members-score-input').length;
          const hasTeamMembersAspects = $('.team-members-aspects-score-input').length;

          if (hasAspects > 0) {
            hasOnlyAspects = true;
          }
          if (hasTeamMembersAspects < 1 && hasTeamMembers > 0) {
            hasOnlyTeamMembers = true;
          }
          if (hasTeamMembersAspects > 0) {
            hasBothTeamMembersAndAspects = true;
          }

          // Has only Aspects
          if (hasOnlyAspects) {
            $('.aspects-score-input').each(function() {
              const aspectId = $(this).attr('id');
              var valueSet = $(this).val();
              const aspectDoc = AspectsListItems.findOne({ _id: aspectId });
              if (aspectDoc && aspectDoc._id) {
                AspectsListItems.update(
                  { _id: aspectDoc._id },
                  { $set: {
                    targetScore: valueSet,
                  } }
                );
              }
            });

            const aspectsDocs = AspectsListItems.find({ cardId });
            if (aspectsDocs.count() > 0) {
              var aspectsTotalScore = 0;
              aspectsDocs.forEach((doc) => {
                const aspectTargetScore = parseFloat(doc.targetScore);
                if (aspectTargetScore > 0) {
                  aspectsTotalScore += aspectTargetScore;
                }
              });

              const composedScore = aspectsTotalScore;
              if (dueScoreComposeMethod === 'average') {
                composedScore = aspectsTotalScore / aspectsDocs.count();
              }

              card.setDue(date);
              card.setTargetScore(composedScore.toFixed(2).toString());
              card.reloadHistoricScoreChart();
              Modal.close('editCardDueComposedScoreModal');
            }
          }

          // Has only Team-Members
          if (hasOnlyTeamMembers) {
            $('.team-members-score-input').each(function() {
              const userId = $(this).attr('id');
              var valueSet = $(this).val();
              const teamMemberScore = TeamMembersScores.findOne({ cardId, userId });
              if (teamMemberScore && teamMemberScore._id) {
                TeamMembersScores.update(
                  { _id: teamMemberScore._id },
                  { $set: {
                    targetScore: valueSet,
                  } }
                );
              }
            });

            const teamMembersScores = TeamMembersScores.find({ cardId });
            if (teamMembersScores.count() > 0) {
              var teamMembersTotalScore = 0;
              teamMembersScores.forEach((doc) => {
                const team_member_score = parseFloat(doc.targetScore);
                if (team_member_score > 0) {
                  teamMembersTotalScore += team_member_score;
                }
              });

              const composedScore = teamMembersTotalScore;
              if (dueScoreComposeMethod === 'average') {
                composedScore = teamMembersTotalScore / teamMembersScores.count();
              }

              card.setDue(date);
              card.setTargetScore(composedScore.toFixed(2).toString());
              card.reloadHistoricScoreChart();
              Modal.close('editCardDueComposedScoreModal');
            }
          }

          // Has both Team-Members & Aspects
          if (hasBothTeamMembersAndAspects) {
            $('.team-members-aspects-score-input').each(function() {
              const teamMembersAspectsId = $(this).attr('id');
              var valueSet = $(this).val();
              TeamMembersAspects.update(
                { _id: teamMembersAspectsId },
                { $set: {
                  targetScore: valueSet,
                } }
              );
            });

            $('.team-members-score-input').each(function() {
              const userId = $(this).attr('id');
              var teamMemberTotalAspectsTargetScores = 0;
              const teamMemberAspects = TeamMembersAspects.find({ userId, cardId });
              if (teamMemberAspects.count() > 0) {
                teamMemberAspects.forEach((teamMemberAspect) => {
                  var targetScore = parseFloat(teamMemberAspect.targetScore);
                  if (targetScore > 0) {
                    teamMemberTotalAspectsTargetScores += targetScore;
                  }
                });

                const teamMemberScore = TeamMembersScores.findOne({ cardId, userId });
                if (teamMemberScore && teamMemberScore._id) {
                  TeamMembersScores.update(
                    { _id: teamMemberScore._id },
                    { $set: {
                      targetScore: teamMemberTotalAspectsTargetScores.toFixed(2).toString(),
                    } }
                  );

                  const teamMembersScores = TeamMembersScores.find({ cardId });
                  if (teamMembersScores.count() > 0) {
                    var teamMembersTotalScore = 0;
                    teamMembersScores.forEach((doc) => {
                      const team_member_score = parseFloat(doc.targetScore);
                      if (team_member_score > 0) {
                        teamMembersTotalScore += team_member_score;
                      }
                    });

                    const composedScore = teamMembersTotalScore;
                    if (dueScoreComposeMethod === 'average') {
                      composedScore = teamMembersTotalScore / teamMembersScores.count();
                    }

                    card.setDue(date);
                    card.setTargetScore(composedScore);
                    card.reloadHistoricScoreChart();
                    Modal.close('editCardDueComposedScoreModal');
                  }
                }
              }
            });
          }
        }
      },
    }];
  },
}).register('editCardDueComposedScoreModal');

Template.editCardDueComposedScoreModal.helpers({
  choseAverage() {
    const cardId = Session.get('composedDueScoreCardId');
    const actualCard = Cards.findOne({ _id: cardId });
    if (actualCard && actualCard._id && actualCard.choseAverageDue && actualCard.choseAverageDue === true) {
      return true;
    } else {
      return false;
    }
  },

  hasOnlyAspects() {
    const cardId = Session.get('composedDueScoreCardId');
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

    if (hasAspects && !hasTeamMembers) {
      return true;
    } else {
      return false;
    }
  },

  hasOnlyTeamMembers() {
    const cardId = Session.get('composedDueScoreCardId');
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

    if (hasTeamMembers && !hasAspects) {
      return true;
    } else {
      return false;
    }
  },

  hasBothTeamMembersAndAspects() {
    const cardId = Session.get('composedDueScoreCardId');
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

    if (hasAspects && hasTeamMembers) {
      return true;
    } else {
      return false;
    }
  },

  aspects() {
    const cardId = Session.get('composedDueScoreCardId');
    return AspectsListItems.find({ cardId });
  },

  teamMembers() {
    const cardId = Session.get('composedDueScoreCardId');
    const actualCard = Cards.findOne({ _id: cardId });
    if (actualCard && actualCard.team_members && actualCard.team_members.length > 0) {
      return Users.find({_id: {$in: actualCard.team_members}});
    }
  },

  teamMemberScore(userId) {
    const cardId = Session.get('composedDueScoreCardId');
    const teamMemberScore = TeamMembersScores.findOne({ cardId, userId });
    if (teamMemberScore && teamMemberScore._id) {
      return teamMemberScore.targetScore;
    }
  },

  teamMemberAspects(userId) {
    const cardId = Session.get('composedDueScoreCardId');
    return TeamMembersAspects.find({ cardId, userId });
  },

  teamMemberAspectTitle(teamMembersAspectsId) {
    const teamMemberAspect = TeamMembersAspects.findOne({ _id: teamMembersAspectsId });
    if (teamMemberAspect && teamMemberAspect._id) {
      const cardId = Session.get('composedDueScoreCardId');
      const aspect = AspectsListItems.findOne({ cardId, _id: teamMemberAspect.aspectsId });
      if (aspect && aspect._id) {
        return aspect.title;
      }
    }
  },
});

