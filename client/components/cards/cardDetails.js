import Chart from 'chart.js';
const subManager = new SubsManager();
const { calculateIndexData, enableClickOnTouch } = Utils;
scoreChart = null;

let cardColors;
Meteor.startup(() => {
  cardColors = Cards.simpleSchema()._schema.color.allowedValues;
});

BlazeComponent.extendComponent({
  mixins() {
    return [Mixins.InfiniteScrolling, Mixins.PerfectScrollbar];
  },

  calculateNextPeak() {
    const cardElement = this.find('.js-card-details');
    if (cardElement) {
      const altitude = cardElement.scrollHeight;
      this.callFirstWith(this, 'setNextPeak', altitude);
    }
  },

  reachNextPeak() {
    const activitiesComponent = this.childComponents('activities')[0];
    activitiesComponent.loadNextPage();
  },

  onCreated() {
    this.currentBoard = Boards.findOne(Session.get('currentBoard'));
    this.isLoaded = new ReactiveVar(false);
    const boardBody =  this.parentComponent().parentComponent();
    //in Miniview parent is Board, not BoardBody.
    if (boardBody !== null) {
      boardBody.showOverlay.set(true);
      boardBody.mouseHasEnterCardDetails = false;
    }
    this.calculateNextPeak();

    Meteor.subscribe('unsaved-edits');
    Meteor.subscribe('aspects_lists');
    Meteor.subscribe('aspects_list_items');
  },

  isWatching() {
    const card = this.currentData();
    return card.findWatcher(Meteor.userId());
  },

  hiddenSystemMessages() {
    return Meteor.user().hasHiddenSystemMessages();
  },

  canModifyCard() {
    if ( Meteor.user().regularBoard() || Meteor.user().isBoardTemplateAdmin() ) {
    	return true;
    } else {
    	return false;
    }
  },

  scrollParentContainer() {
    const cardPanelWidth = 510;
    const bodyBoardComponent = this.parentComponent().parentComponent();
    //On Mobile View Parent is Board, Not Board Body. I cant see how this funciton should work then.
    if (bodyBoardComponent === null) return;
    const $cardView = this.$(this.firstNode());
    const $cardContainer = bodyBoardComponent.$('.js-swimlanes');
    const cardContainerScroll = $cardContainer.scrollLeft();
    const cardContainerWidth = $cardContainer.width();

    const cardViewStart = $cardView.offset().left;
    const cardViewEnd = cardViewStart + cardPanelWidth;

    let offset = false;
    if (cardViewStart < 0) {
      offset = cardViewStart;
    } else if (cardViewEnd > cardContainerWidth) {
      offset = cardViewEnd - cardContainerWidth;
    }

    if (offset) {
      bodyBoardComponent.scrollLeft(cardContainerScroll + offset);
    }

    //Scroll top
    const cardViewStartTop = $cardView.offset().top;
    const cardContainerScrollTop = $cardContainer.scrollTop();

    let topOffset = false;
    if(cardViewStartTop !== 100){
      topOffset = cardViewStartTop - 100;
    }
    if(topOffset !== false) {
      bodyBoardComponent.scrollTop(cardContainerScrollTop + topOffset);
    }

  },

  presentParentTask() {
    let result = this.currentBoard.presentParentTask;
    if ((result === null) || (result === undefined)) {
      result = 'no-parent';
    }
    return result;
  },

  hasMembers() {
  	const cardId = this.currentData()._id;
    const card = Cards.findOne({_id: cardId});

    if (card && card.members && card.members.length > 0) {
    	const cardMembers = card.members;
    	var membersCount = 0;
    	var nonExistinUsersCount = 0;
    	var needsToUpdateCardMembers = false;
    	var idsToBeRemoved = [];

    	cardMembers.forEach((cardMember) => {
    		const user = Users.findOne({_id: cardMember});
    		if (!user) {
    			needsToUpdateCardMembers = true;
    			idsToBeRemoved.push(cardMember);
    			nonExistinUsersCount++;
    		} else {
    			membersCount++;
    		}
    	});

    	var filteredMembers = [];
    	if (needsToUpdateCardMembers) {
    		cardMembers.forEach((cardMember) => {
    			if (!idsToBeRemoved.includes(cardMember)) {
    				filteredMembers.push(cardMember);
    			}
    		});
    		Cards.update(
  				{ _id: cardId }, {
  					$unset: {
  						members: ''
  					}
  				}
    		);
    		Cards.update(
  				{ _id: cardId }, {
  					$set: {
  						members: filteredMembers
  					}
  				}
    		);
    	}

    	const realMembersCount = membersCount - nonExistinUsersCount;
    	if (realMembersCount > 0) {
      	return true;
    	} else {
      	return false;
    	}
    } else {
    	return false;
    }
  },

  hasTeamMembers() {
  	const cardId = this.currentData()._id;
    const card = Cards.findOne({_id: cardId});

    if (card && card.team_members && card.team_members.length > 0) {
    	return true;
    } else {
    	return false;
    }
  },

  getCardMembers() {
    const card = Cards.findOne({_id: this.currentData()._id});
    if (card && card._id) {
    	return card.members;
    }
  },

  linkForCard() {
    const card = this.currentData();
    let result = '#';
    if (card) {
      const board = Boards.findOne(card.boardId);
      if (board) {
        result = FlowRouter.url('card', {
          boardId: card.boardId,
          slug: board.slug,
          cardId: card._id,
        });
      }
    }
    return result;
  },

  onRendered() {
    if (!Utils.isMiniScreen()) {
      Meteor.setTimeout(() => {
        $('.card-details').mCustomScrollbar({theme:'minimal-dark', setWidth: false, setLeft: 0, scrollbarPosition: 'outside', mouseWheel: true });
        this.scrollParentContainer();
      }, 500);
    }
    const $checklistsDom = this.$('.card-checklist-items');

    $checklistsDom.sortable({
      tolerance: 'pointer',
      helper: 'clone',
      handle: '.checklist-title',
      items: '.js-checklist',
      placeholder: 'checklist placeholder',
      distance: 7,
      start(evt, ui) {
        ui.placeholder.height(ui.helper.height());
        EscapeActions.executeUpTo('popup-close');
      },
      stop(evt, ui) {
        let prevChecklist = ui.item.prev('.js-checklist').get(0);
        if (prevChecklist) {
          prevChecklist = Blaze.getData(prevChecklist).checklist;
        }
        let nextChecklist = ui.item.next('.js-checklist').get(0);
        if (nextChecklist) {
          nextChecklist = Blaze.getData(nextChecklist).checklist;
        }
        const sortIndex = calculateIndexData(prevChecklist, nextChecklist, 1);

        $checklistsDom.sortable('cancel');
        const checklist = Blaze.getData(ui.item.get(0)).checklist;

        Checklists.update(checklist._id, {
          $set: {
            sort: sortIndex.base,
          },
        });
      },
    });

    // ugly touch event hotfix
    enableClickOnTouch('.card-checklist-items .js-checklist');

    const $subtasksDom = this.$('.card-subtasks-items');

    $subtasksDom.sortable({
      tolerance: 'pointer',
      helper: 'clone',
      handle: '.subtask-title',
      items: '.js-subtasks',
      placeholder: 'subtasks placeholder',
      distance: 7,
      start(evt, ui) {
        ui.placeholder.height(ui.helper.height());
        EscapeActions.executeUpTo('popup-close');
      },
      stop(evt, ui) {
        let prevChecklist = ui.item.prev('.js-subtasks').get(0);
        if (prevChecklist) {
          prevChecklist = Blaze.getData(prevChecklist).subtask;
        }
        let nextChecklist = ui.item.next('.js-subtasks').get(0);
        if (nextChecklist) {
          nextChecklist = Blaze.getData(nextChecklist).subtask;
        }
        const sortIndex = calculateIndexData(prevChecklist, nextChecklist, 1);

        $subtasksDom.sortable('cancel');
        const subtask = Blaze.getData(ui.item.get(0)).subtask;

        Subtasks.update(subtask._id, {
          $set: {
            subtaskSort: sortIndex.base,
          },
        });
      },
    });

    // ugly touch event hotfix
    enableClickOnTouch('.card-subtasks-items .js-subtasks');

    function userIsMember() {
      return Meteor.user() && Meteor.user().isBoardMember();
    }

    // Disable sorting if the current user is not a board member
    this.autorun(() => {
      if ($checklistsDom.data('ui-sortable')) {
        $checklistsDom.sortable('option', 'disabled', !userIsMember());
      }
      if ($subtasksDom.data('ui-sortable')) {
        $subtasksDom.sortable('option', 'disabled', !userIsMember());
      }
    });

    /**************/

    var idsToPull = new Array();
    CardScores.find({
    	cardId: this.currentData()._id
  	}).forEach((cardScore) => {
    	if (cardScore && !cardScore.score || cardScore.score === '' || cardScore.score === null) {
    		idsToPull.push(cardScore._id);
    	}
    });
    for (var i = 0; i < idsToPull.length; i++) {
      CardScores.remove({_id: idsToPull[i]});
    }

    /**************/

    /*********/

		const startScores = CardScores.find({
			cardId: this.currentData()._id,
			type: 'current',
		}, {
			sort: {date: -1}
		}).fetch();
		// If no CardScores and If Cards has initialScore and no currentScore
		if (startScores.length < 1 &&
				this.currentData() && this.currentData().initialScore && this.currentData().initialScore != '' && this.currentData().initialScore != null &&
				!this.currentData().currentScore || this.currentData().currentScore == '' || this.currentData().currentScore == null &&
				this.currentData().startAt
		) {
			CardScores.insert({
				boardId: this.currentData().boardId,
        cardId: this.currentData()._id,
        score: this.currentData().initialScore,
        type: 'current',
        date: this.currentData().startAt,
        userId: this.currentData().userId
			});
		}
		// else if no CardScores and If Cards has currentScore and no initialScore
		else if (startScores.length < 1 &&
				this.currentData() && this.currentData().currentScore && this.currentData().currentScore != '' && this.currentData().currentScore != null &&
				this.currentData().startAt
		) {
			CardScores.insert({
				boardId: this.currentData().boardId,
        cardId: this.currentData()._id,
        score: this.currentData().currentScore,
        type: 'current',
        date: this.currentData().startAt,
        userId: this.currentData().userId
			});
		}

    /*********/

    const cardScores = this.currentData().scores();
    let labels = []
    let scores = {'current': [], 'target': []};
    cardScores.forEach((cardScore) => {
    	if (cardScore && cardScore.score && cardScore.date) {
        labels.push(cardScore.date);
        var score = cardScore.score;
        if (typeof score === 'number') {
          score = score.toString();
        }
        scores[cardScore.type].push({x: cardScore.date, y: score.replace('%', '').trim(), pointId: cardScore._id});
    	}
    });

    $('#historicScores').hide();
    if (labels.length > 0) {
      $('#historicScores').show();
    } else {
    	if (this.currentData().currentScore && this.currentData().currentScore.length > 0
    			&& this.currentData().startAt && this.currentData().startAt.toString().length > 0
    	) {
    		CardScores.insert({
          boardId: this.currentData().boardId,
          cardId: this.currentData()._id,
          score: this.currentData().currentScore,
          type: 'current',
          date: this.currentData().startAt
        });
        $('#historicScores').show();
    	}
    	if (this.currentData().targetScore && this.currentData().targetScore.length > 0
    			&& this.currentData().dueAt && this.currentData().dueAt.toString().length > 0
    	) {
    		CardScores.insert({
          boardId: this.currentData().boardId,
          cardId: this.currentData()._id,
          score: this.currentData().targetScore,
          type: 'target',
          date: this.currentData().dueAt
        });
        $('#historicScores').show();
    	}
    	var hasCardScores = CardScores.findOne({
    		cardId: this.currentData()._id
    	});
    	if (hasCardScores && hasCardScores._id && hasCardScores.score && hasCardScores.date) {
        $('#historicScores').show();
    	} else {
        $('#historicScores').hide();
    	}
    }
    let list = this.currentData().list();
    let cardStart = list.getProperty('card-start');
    let cardStartColor = '#0079bf';
    if (cardStart !== null) {
        cardStartColor = cardStart.color;
    }
    let cardDue = list.getProperty('card-due');
    let cardDueColor = '#3cb500';
    if (cardDue !== null) {
      cardDueColor = cardDue.color;
    }

    let chartCtx = $('.score-line');

    let receivedScore = '';
    let currentScore = '';
    let targetScore = '';
    let endScore = '';

    if (this.currentData() && this.currentData().initialScore && this.currentData().initialScore.length > 0) {
    	receivedScore = this.currentData().initialScore;
    }
    if (this.currentData() && this.currentData().currentScore && this.currentData().currentScore.length > 0) {
    	currentScore = this.currentData().currentScore;
    }
    if (this.currentData() && this.currentData().targetScore && this.currentData().targetScore.length > 0) {
    	targetScore = this.currentData().targetScore;
    }
    if (this.currentData() && this.currentData().endScore && this.currentData().endScore.length > 0) {
    	endScore = this.currentData().endScore;
    }

    let fourScores = new Array(receivedScore, currentScore, targetScore, endScore)
    let scoreBearers = new Array();
    for (var i = 0; i < fourScores.length; i++) {
    	if (fourScores[i] != '') {
    		scoreBearers.push(fourScores[i]);
    	}
    }

    // … (three dots) in front of an array will convert array to distinct variables e.g: from [1,2,3] to (1,2,3)
    let minScore = Math.min(...scoreBearers);
    let maxScore = Math.max(...scoreBearers);
    let yAxesMinNum;
    let yAxesMaxNum;
    let range = maxScore - minScore;
    if (range === 0) {
      yAxesMinNum = minScore - 1;
      yAxesMaxNum = maxScore + 1;
    } else {
      let rangeLogTen = Math.log10(maxScore - minScore);
      let flooredRangeLogTen = Math.floor(rangeLogTen);
      let bottomMargin = Math.round(minScore * flooredRangeLogTen) / minScore;
      let topMargin = Math.round(maxScore * flooredRangeLogTen) / maxScore;
      yAxesMinNum = minScore - bottomMargin;
      yAxesMaxNum = maxScore + topMargin;
    }

    scoreChart = new Chart(chartCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
            label: 'Current Score',
            backgroundColor: cardStartColor,
            borderColor: cardStartColor,
            data: scores['current'],
            fill: false
        }, {
            label: 'Target Score',
            backgroundColor: cardDueColor,
            borderColor: cardDueColor,
            data: scores['target'],
            fill: false,
            showLine: false,
            pointStyle: 'rectRot',
            pointRadius: 6,
            pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        title: {
          display: true,
          text: 'Historic scores'
        },
        scales: {
          xAxes: [{
            type: 'time',
            display: true,
            time: {
              unit: 'day',
              displayFormats: {
                day: 'DD/MM/YYYY'
              },
              tooltipFormat: 'DD/MM/YYYY'
            },
            scaleLabel: {
              display: true,
              labelString: 'Date'
            },
            ticks: {
              autoSkip: true,
              minRotation: 45
            }
          }],
          yAxes: [{
            display: true,
            scaleLabel: {
              display: true,
              labelString: 'Score'
		        },
		        ticks: {
		        	suggestedMin: yAxesMinNum,
		        	suggestedMax: yAxesMaxNum
		        }
          }]
        }
      }
    });
    scoreChart.scales["x-axis-0"].options.ticks.autoSkip = false;
    scoreChart.scales["x-axis-0"].options.ticks.stepSize = 1;
  },

  onDestroyed() {
    const parentComponent =  this.parentComponent().parentComponent();
    //on mobile view parent is Board, not board body.
    if (parentComponent === null) return;
    parentComponent.showOverlay.set(false);
  },

  aspectsListItems() {
    return AspectsListItems.find({
    	aspectsListId: this.currentData().aspectsListId,
    	cardId: this.currentData()._id
  	});
  },

  events() {
    const events = {
      [`${CSSEvents.transitionend} .js-card-details`]() {
        this.isLoaded.set(true);
      },
      [`${CSSEvents.animationend} .js-card-details`]() {
        this.isLoaded.set(true);
      },
    };

    return [{
      ...events,
      'click .js-close-card-details' () {
        Utils.goBoardId(this.data().boardId);
      },
      'click .js-open-card-details-menu': Popup.open('cardDetailsActions'),
      'submit .js-card-description' (evt) {
        evt.preventDefault();
        const description = this.currentComponent().getValue();
        this.data().setDescription(description);
      },
      'submit .js-card-details-title' (evt) {
        evt.preventDefault();
        const title = this.currentComponent().getValue().trim();
        if (title) {
          this.data().setTitle(title);
        }
      },
      'submit .js-card-details-assigner'(evt) {
        evt.preventDefault();
        const assigner = this.currentComponent().getValue().trim();
        if (assigner) {
          this.data().setAssignedBy(assigner);
        }
      },
      'submit .js-card-details-requester'(evt) {
        evt.preventDefault();
        const requester = this.currentComponent().getValue().trim();
        if (requester) {
          this.data().setRequestedBy(requester);
        }
      },
      'click .js-member:not(.team-member)': Popup.open('cardMember'),
      'click .js-add-members': Popup.open('cardMembers'),
      'click .js-addTeamMembers': Popup.open('cardTeamMembers'),
      'click .js-add-labels': Popup.open('cardLabels'),
      'click .js-received-date': Popup.open('editCardReceivedDate'),
      'click .js-start-date': Popup.open('editCardStartDate'),
      'click .js-due-date': Popup.open('editCardDueDate'),
      'click .js-end-date': Popup.open('editCardEndDate'),
      'mouseenter .js-card-details' () {
        const parentComponent =  this.parentComponent().parentComponent();
        //on mobile view parent is Board, not BoardBody.
        if (parentComponent === null) return;
        parentComponent.showOverlay.set(true);
        parentComponent.mouseHasEnterCardDetails = true;
      },
      'click #toggleButton'() {
        Meteor.call('toggleSystemMessages');
      },

      'click #addAspect' (evt) {
        evt.preventDefault();
        $('#addAspect').css('display', 'none');
        $('#add-aspects-list-item-form').css('display', 'block');
        const inputSelector = $('textarea#js-add-aspects-list-item');
        inputSelector.val('');
        inputSelector.focus();
      },

      
      'click .aspectItem a.editAspect' (evt) {
        evt.preventDefault();
        const parentId = $(evt.target).parent().attr('id');
        const aspectId = $(evt.target).attr('data-aspect-id');
        const title = $(evt.target).attr('data-title') ;
        
        $('#'+parentId+' a.editAspect').css('display', 'none');
        $('#edit-aspects-list-item-form-'+aspectId).css('display', 'block');
        const inputSelector = $('textarea#'+aspectId);
        inputSelector.val(title);
        inputSelector.focus();
      },
      
      'click .removeAspect' (evt) {
        const aspectId = $(evt.target).closest('a').data('aspect-id');
        const aspectTitle = $(evt.target).closest('a').data('title');
        var cardId = '';
        const teamMemberAspect = TeamMembersAspects.findOne({ aspectsId: aspectId});
        if (teamMemberAspect && teamMemberAspect._id) {
          cardId = teamMemberAspect.cardId;
        }

        swal({
          title: 'Confirm remove aspect "'+aspectTitle+'"!',
          text: 'Are you sure?',
          icon: "warning",
          buttons: [true, 'Remove'],
          dangerMode: true,
        })
        .then((okDelete) => {
          if (okDelete) {
            AspectsListItems.remove({ _id: aspectId }, (err, res) => {
              if (err) {
                swal(err, {
                  icon: "success",
                });
              } else if (res) {
                const idsToRemove = new Array();
                TeamMembersAspects.find({ aspectsId: aspectId}).forEach((teamMemberAspect) => {
                  idsToRemove.push(teamMemberAspect._id);
                });

                for (var i = 0; i < idsToRemove.length; i++) {
                  TeamMembersAspects.remove({_id: idsToRemove[i]});
                }

                // Recalculate the card's composed initial/current/target scores by first checking if
                // (i)  card has only aspect(s) remaining or
                // (ii) card has both aspect(s) and team member(s) remaining
                // If case (i) is present, recalculate the card's composed initial/current/target scores
                // by simply adding the initial/current/target scores of the aspects
                // If case (ii) is present, recalculate the card's composed initial/current/target scores
                // by first recalculating the TeamMembersScores with the total of their remaining TeamMembersAspects scores
                // and then by adding the card's TeamMembersScores
                // *** IMPORTANT NOTE *** : The addition of the scores is valid only if the user did not chose "Average".
                // So before setting the initialScore, currentScore and targetScore, we need to check which method is valid for that
                // specific score to be composed with.
                const card = Cards.findOne(cardId);
                if (card && card._id) {
                  var hasAspectsonly = false;
                  var hasbothAspectsAndTeamMembers = false;

                  const aspects = AspectsListItems.find({ cardId: card._id });
                  if (aspects.count() > 0 && card.team_members.length < 1) {
                    hasAspectsonly = true;
                  }

                  if (card.team_members.length > 0 && aspects.count() > 0) {
                    hasbothAspectsAndTeamMembers = true;
                  }

                  if (hasAspectsonly) {
                    var totalAspectsInitialScore = 0;
                    var totalAspectsCurrentScore = 0;
                    var totalAspectsTargetScore = 0;
                    aspects.forEach((aspect) => {
                      if (aspect.initialScore) {
                        var initialScore = parseFloat(aspect.initialScore);
                        if (initialScore > 0) {
                          totalAspectsInitialScore += initialScore;
                        }
                      }
                      if (aspect.currentScore) {
                        var currentScore = parseFloat(aspect.currentScore);
                        if (currentScore > 0) {
                          totalAspectsCurrentScore += currentScore;
                        }
                      }
                      if (aspect.targetScore) {
                        var targetScore = parseFloat(aspect.targetScore);
                        if (targetScore > 0) {
                          totalAspectsTargetScore += targetScore;
                        }
                      }
                    });

                    var finalTotalAspectsInitialScore = totalAspectsInitialScore;
                    var finalTotalAspectsCurrentScore = totalAspectsCurrentScore;
                    var finalTotalAspectsTargetScore = totalAspectsTargetScore;
                    if (card.choseAverageReceived && card.choseAverageReceived === true) {
                      finalTotalAspectsInitialScore = totalAspectsInitialScore / aspects.count();
                    }
                    if (card.choseAverageStart && card.choseAverageStart === true) {
                      finalTotalAspectsCurrentScore = totalAspectsCurrentScore / aspects.count();
                    }
                    if (card.choseAverageDue && card.choseAverageDue === true) {
                      finalTotalAspectsTargetScore = totalAspectsTargetScore / aspects.count();
                    }

                    card.setInitialScore(finalTotalAspectsInitialScore.toFixed(2).toString());
                    card.setCurrentScore(finalTotalAspectsCurrentScore.toFixed(2).toString());
                    card.setTargetScore(finalTotalAspectsTargetScore.toFixed(2).toString());
                  } else if (hasbothAspectsAndTeamMembers) {
                    const teamMembers = card.team_members;
                    teamMembers.forEach((teamMember) => {
                      var teamMemberInitialScore = 0;
                      var teamMemberCurrentScore = 0;
                      var teamMemberTargetScore = 0;
                      const teamMembersAspects = TeamMembersAspects.find({ userId: teamMember, cardId });
                      if (teamMembersAspects.count() > 0) {
                        teamMembersAspects.forEach((teamMemberAspect) => {
                          var initialScore = parseFloat(teamMemberAspect.initialScore);
                          if (initialScore > 0) {
                            teamMemberInitialScore += initialScore;
                          }
                          var currentScore = parseFloat(teamMemberAspect.currentScore);
                          if (currentScore > 0) {
                            teamMemberCurrentScore += currentScore;
                          }
                          var targetScore = parseFloat(teamMemberAspect.targetScore);
                          if (currentScore > 0) {
                            teamMemberTargetScore += targetScore;
                          }
                        });
                        const teamMemberScore = TeamMembersScores.findOne({ userId: teamMember, cardId });
                        if (teamMemberScore && teamMemberScore._id) {
                          TeamMembersScores.update(
                            { _id: teamMemberScore._id },
                            { $set: {
                              initialScore: teamMemberInitialScore.toFixed(2).toString(),
                              currentScore: teamMemberCurrentScore.toFixed(2).toString(),
                              targetScore: teamMemberTargetScore.toFixed(2).toString()
                            } }
                          );
                        }
                      }
                    });

                    const teamMembersScores = TeamMembersScores.find({ cardId });
                    if (teamMembersScores.count() > 0) {
                      var totalTeamMembersInitialScores = 0;
                      var totalTeamMembersCurrentScores = 0;
                      var totalTeamMembersTargetScores = 0;
                      teamMembersScores.forEach((teamMemberScore) => {
                        var teamMemberInitialScore = parseFloat(teamMemberScore.initialScore);
                        if (teamMemberInitialScore > 0) {
                          totalTeamMembersInitialScores += teamMemberInitialScore;
                        }
                        var teamMemberCurrentScore = parseFloat(teamMemberScore.currentScore);
                        if (teamMemberCurrentScore > 0) {
                          totalTeamMembersCurrentScores += teamMemberCurrentScore;
                        }
                        var teamMemberTargetScore = parseFloat(teamMemberScore.targetScore);
                        if (teamMemberTargetScore > 0) {
                          totalTeamMembersTargetScores += teamMemberTargetScore;
                        }
                      });

                      var finalTotalTeamMembersInitialScores = totalTeamMembersInitialScores;
                      var finalTotalTeamMembersCurrentScores = totalTeamMembersCurrentScores;
                      var finalTotalTeamMembersTargetScores = totalTeamMembersTargetScores;
                      if (card.choseAverageReceived && card.choseAverageReceived === true) {
                        finalTotalTeamMembersInitialScores = totalTeamMembersInitialScores / teamMembersScores.count();
                      }
                      if (card.choseAverageStart && card.choseAverageStart === true) {
                        finalTotalTeamMembersCurrentScores = totalTeamMembersCurrentScores / teamMembersScores.count();
                      }
                      if (card.choseAverageDue && card.choseAverageDue === true) {
                        finalTotalTeamMembersTargetScores = totalTeamMembersTargetScores / teamMembersScores.count();
                      }

                      card.setInitialScore(finalTotalTeamMembersInitialScores.toFixed(2).toString());
                      card.setCurrentScore(finalTotalTeamMembersCurrentScores.toFixed(2).toString());
                      card.setTargetScore(finalTotalTeamMembersTargetScores.toFixed(2).toString());
                    }
                  }
                }

                message = TAPi18n.__('Successfully removed aspect');
                swal(message, {
                  icon: "success",
                });
              }
            });
          } else {
            return false;
          }
        });
      },

      'click #js-close-aspects-list-item-form' (evt) {
        $('#add-aspects-list-item-form').css('display', 'none');
        $('#addAspect').css('display', 'block');
      },

      
      'click .js-close-edit-aspects-list-form' (evt) {
         const aspectId = $(evt.target).attr('id');
         $('.aspectItem#'+aspectId+' #edit-aspects-list-item-form-'+aspectId).css('display','none');
         $('.aspectItem#'+aspectId+' a.editAspect').css('display','block');
      },
      // Pressing Enter should click the submit button
      'keydown textarea#js-add-aspects-list-item'(evt) {
        if (evt.keyCode === 13) {
          $('#js-submit-aspects-list-item-form').click();
          $('#js-close-aspects-list-item-form').click();
        }
      },
      
      'keydown textarea.js-edit-aspects-list-item' (evt) {
      	const aspectId = $(evt.target).attr('id');
      	if (evt.keyCode == 13) {
      		$('button#'+aspectId).click();
          $('a#'+aspectId).click();
      	}
      },
      
      'click #js-submit-aspects-list-item-form'(evt) {
        evt.preventDefault();
        const title = $(evt.target).closest('#add-aspects-list-item-controls').siblings('#js-add-aspects-list-item').val();
        if (title.length > 0) {
        	const cardId = this.currentData()._id;
        	const aspectsListId = '';
        	const aspectsList = AspectsLists.findOne({ cardId });
        	if (!aspectsList) {
          	aspectsListId = AspectsLists.insert({ cardId });
          	Cards.update(
        			{ _id: cardId }, {
        				$set: {
        					aspectsListId
        				}
        			}
          	);
        	} else {
          	aspectsListId = aspectsList._id;
          }

        	const aspectId = AspectsListItems.insert({
        		aspectsListId,
        		cardId,
        	  title
          });

          const actualCard = Cards.findOne({_id: cardId});
          if (actualCard && actualCard._id) {
            const teamMembers = actualCard.team_members;
            for (var i = 0; i < teamMembers.length; i++) {
              TeamMembersAspects.insert({
                userId: teamMembers[i],
                cardId,
                aspectsId: aspectId,
              });
            }
          }
        }
        $('#js-close-aspects-list-item-form').click();
      },
      
      'click .js-submit-edit-aspects-list-item-form' (evt) {
        evt.preventDefault();
        const aspectId = $(evt.target).data('id');
        const title = $(evt.target).parent().parent().find('textarea#'+aspectId).val();
        
        if (title.length > 0) {
        	AspectsListItems.update({_id:aspectId},
        			                   {$set:{title:title}
        	                    });
        }
        $('#edit-aspects-list-item-form-'+aspectId).css('display','none');
        $('.aspectItem#'+aspectId+' .editAspect').css('display', 'block');
      },
      
      // chart's data-points click event
      'click canvas.card-details-item.score-line.chartjs-render-monitor': function(evt) {
        evt.preventDefault();
        evt.stopImmediatePropagation();

        if (Meteor.user().canAlterCard()) {
          var activePoints = scoreChart.getElementAtEvent(evt);
          if (activePoints.length > 0) {
            var theElement = scoreChart.config.data.datasets[activePoints[0]._datasetIndex].data[activePoints[0]._index];
            var cardScoreDoc = CardScores.findOne({_id: theElement.pointId})
            var date = cardScoreDoc.date;
            var score = cardScoreDoc.score;
            var type = cardScoreDoc.type;
            this.currentData()['dataPointDate'] = date;
            this.currentData()['dataPointScore'] = score;
            var selector = null;
            if (type == 'current') {
              selector = $('.card-details-item-start a.js-edit-date.card-date.start-date').not('.card-score');
              addNewDate = $('.js-start-date');
            } else if (type == 'target') {
              selector = $('.card-details-item-due a.js-edit-date.card-date.due-date').not('.card-score');
              addNewDate = $('.js-due-date');
            }
            if (selector[0]) {
              selector[0].click();
            } else {
              addNewDate.click();
            }
          }
        }
      },

    }];
  },
}).register('cardDetails');

// We extends the normal InlinedForm component to support UnsavedEdits draft
// feature.
(class extends InlinedForm {
  _getUnsavedEditKey() {
    return {
      fieldName: 'cardDescription',
      // XXX Recovering the currentCard identifier form a session variable is
      // fragile because this variable may change for instance if the route
      // change. We should use some component props instead.
      docId: Session.get('currentCard'),
    };
  }

  close(isReset = false) {
    if (this.isOpen.get() && !isReset) {
      const draft = this.getValue().trim();
      if (draft !== Cards.findOne(Session.get('currentCard')).getDescription()) {
        UnsavedEdits.set(this._getUnsavedEditKey(), this.getValue());
      }
    }
    super.close();
  }

  reset() {
    UnsavedEdits.reset(this._getUnsavedEditKey());
    this.close(true);
  }

  events() {
    const parentEvents = InlinedForm.prototype.events()[0];
    return [{
      ...parentEvents,
      'click .js-close-inlined-form': this.reset,
    }];
  }
}).register('inlinedCardDescription');

Template.cardDetailsActionsPopup.helpers({
  isWatching() {
    return this.findWatcher(Meteor.userId());
  },

  canModifyCard() {
    if ( Meteor.user().regularBoard() || Meteor.user().isBoardTemplateAdmin() ) {
    	return true;
    } else {
    	return false;
    }
  },
});

Template.cardDetailsActionsPopup.events({
  'click .js-members': Popup.open('cardMembers'),
  'click .js-labels': Popup.open('cardLabels'),
  'click .js-attachments': Popup.open('cardAttachments'),
  'click .js-custom-fields': Popup.open('cardCustomFields'),
  'click .js-received-date': Popup.open('editCardReceivedDate'),
  'click .js-start-date': Popup.open('editCardStartDate'),
  'click .js-due-date': Popup.open('editCardDueDate'),
  'click .js-end-date': Popup.open('editCardEndDate'),
  'click .js-spent-time': Popup.open('editCardSpentTime'),
  'click .js-score': Popup.open('editCardScores'),
  'click .js-move-card': Popup.open('moveCard'),
  'click .js-copy-card': Popup.open('copyCard'),
  'click .js-copy-checklist-cards': Popup.open('copyChecklistToManyCards'),
  'click .js-set-card-color': Popup.open('setCardColor'),
  'click .js-move-card-to-top' (evt) {
    evt.preventDefault();
    const minOrder = _.min(this.list().cards(this.swimlaneId).map((c) => c.sort));
    this.move(this.swimlaneId, this.listId, minOrder - 1);
  },
  'click .js-move-card-to-bottom' (evt) {
    evt.preventDefault();
    const maxOrder = _.max(this.list().cards(this.swimlaneId).map((c) => c.sort));
    this.move(this.swimlaneId, this.listId, maxOrder + 1);
  },
  'click .js-archive' (evt) {
    evt.preventDefault();
    this.archive();
    Popup.close();
  },
  'click .js-more': Popup.open('cardMore'),
  'click .js-toggle-watch-card' () {
    const currentCard = this;
    const level = currentCard.findWatcher(Meteor.userId()) ? null : 'watching';
    Meteor.call('watch', 'card', currentCard._id, level, (err, ret) => {
      if (!err && ret) Popup.close();
    });
  },
});

Template.editCardTitleForm.onRendered(function () {
  autosize(this.$('.js-edit-card-title'));
});

Template.editCardTitleForm.events({
  'keydown .js-edit-card-title' (evt) {
    // If enter key was pressed, submit the data
    // Unless the shift key is also being pressed
    if (evt.keyCode === 13 && !evt.shiftKey) {
      $('.js-submit-edit-card-title-form').click();
    }
  },
});

Template.editCardRequesterForm.onRendered(function() {
  autosize(this.$('.js-edit-card-requester'));
});

Template.editCardRequesterForm.events({
  'keydown .js-edit-card-requester'(evt) {
    // If enter key was pressed, submit the data
    if (evt.keyCode === 13) {
      $('.js-submit-edit-card-requester-form').click();
    }
  },
});

Template.editCardAssignerForm.onRendered(function() {
  autosize(this.$('.js-edit-card-assigner'));
});

Template.editCardAssignerForm.events({
  'keydown .js-edit-card-assigner'(evt) {
    // If enter key was pressed, submit the data
    if (evt.keyCode === 13) {
      $('.js-submit-edit-card-assigner-form').click();
    }
  },
});

Template.moveCardPopup.events({
  'click .js-done' () {
    // XXX We should *not* get the currentCard from the global state, but
    // instead from a “component” state.
    const card = Cards.findOne(Session.get('currentCard'));
    const bSelect = $('.js-select-boards')[0];
    const boardId = bSelect.options[bSelect.selectedIndex].value;
    const lSelect = $('.js-select-lists')[0];
    const listId = lSelect.options[lSelect.selectedIndex].value;
    const slSelect = $('.js-select-swimlanes')[0];
    const swimlaneId = slSelect.options[slSelect.selectedIndex].value;
    card.move(boardId, swimlaneId, listId, 0);
    Popup.close();
  },
});
BlazeComponent.extendComponent({
  onCreated() {
    subManager.subscribe('board', Session.get('currentBoard'), false);
    this.selectedBoardId = new ReactiveVar(Session.get('currentBoard'));
  },

  boards() {
    const boards = Boards.find({
      archived: false,
      'members.userId': Meteor.userId(),
      _id: {$ne: Meteor.user().getTemplatesBoardId()},
    }, {
      sort: ['title'],
    });
    return boards;
  },

  swimlanes() {
    const board = Boards.findOne(this.selectedBoardId.get());
    return board.swimlanes();
  },

  aBoardLists() {
    const board = Boards.findOne(this.selectedBoardId.get());
    return board.lists();
  },

  events() {
    return [{
      'change .js-select-boards'(evt) {
        this.selectedBoardId.set($(evt.currentTarget).val());
        subManager.subscribe('board', this.selectedBoardId.get(), false);
      },
    }];
  },
}).register('boardsAndLists');

Template.copyCardPopup.events({
  'click .js-done'() {
    const card = Cards.findOne(Session.get('currentCard'));
    const lSelect = $('.js-select-lists')[0];
    listId = lSelect.options[lSelect.selectedIndex].value;
    const slSelect = $('.js-select-swimlanes')[0];
    const swimlaneId = slSelect.options[slSelect.selectedIndex].value;
    const bSelect = $('.js-select-boards')[0];
    const boardId = bSelect.options[bSelect.selectedIndex].value;
    const textarea = $('#copy-card-title');
    const title = textarea.val().trim();
    // insert new card to the bottom of new list
    card.sort = Lists.findOne(card.listId).cards().count();

    if (title) {
      card.title = title;
      card.coverId = '';
      const _id = card.copy(boardId, swimlaneId, listId);
      // In case the filter is active we need to add the newly inserted card in
      // the list of exceptions -- cards that are not filtered. Otherwise the
      // card will disappear instantly.
      // See https://github.com/wekan/wekan/issues/80
      Filter.addException(_id);

      Popup.close();
    }
  },
});

Template.copyChecklistToManyCardsPopup.events({
  'click .js-done' () {
    const card = Cards.findOne(Session.get('currentCard'));
    const oldId = card._id;
    card._id = null;
    const lSelect = $('.js-select-lists')[0];
    card.listId = lSelect.options[lSelect.selectedIndex].value;
    const slSelect = $('.js-select-swimlanes')[0];
    card.swimlaneId = slSelect.options[slSelect.selectedIndex].value;
    const bSelect = $('.js-select-boards')[0];
    card.boardId = bSelect.options[bSelect.selectedIndex].value;
    const textarea = $('#copy-card-title');
    const titleEntry = textarea.val().trim();
    // insert new card to the bottom of new list
    card.sort = Lists.findOne(card.listId).cards().count();

    if (titleEntry) {
      const titleList = JSON.parse(titleEntry);
      for (let i = 0; i < titleList.length; i++){
        const obj = titleList[i];
        card.title = obj.title;
        card.description = obj.description;
        card.coverId = '';
        const _id = Cards.insert(card);
        // In case the filter is active we need to add the newly inserted card in
        // the list of exceptions -- cards that are not filtered. Otherwise the
        // card will disappear instantly.
        // See https://github.com/wekan/wekan/issues/80
        Filter.addException(_id);

        // copy checklists
        Checklists.find({cardId: oldId}).forEach((ch) => {
          ch.copy(_id);
        });

        // copy subtasks
        cursor = Cards.find({parentId: oldId});
        cursor.forEach(function() {
          'use strict';
          const subtask = arguments[0];
          subtask.parentId = _id;
          subtask._id = null;
          /* const newSubtaskId = */ Cards.insert(subtask);
        });

        // copy card comments
        CardComments.find({cardId: oldId}).forEach((cmt) => {
          cmt.copy(_id);
        });
      }
      Popup.close();
    }
  },
});

BlazeComponent.extendComponent({
  onCreated() {
    this.currentCard = this.currentData();
    this.currentColor = new ReactiveVar(this.currentCard.color);
  },

  colors() {
    return cardColors.map((color) => ({ color, name: '' }));
  },

  isSelected(color) {
    if (this.currentColor.get() === null) {
      return color === 'white';
    }
    return this.currentColor.get() === color;
  },

  events() {
    return [{
      'click .js-palette-color'() {
        this.currentColor.set(this.currentData().color);
      },
      'click .js-submit' () {
        this.currentCard.setColor(this.currentColor.get());
        Popup.close();
      },
      'click .js-remove-color'() {
        this.currentCard.setColor(null);
        Popup.close();
      },
    }];
  },
}).register('setCardColorPopup');

BlazeComponent.extendComponent({
  onCreated() {
    this.currentCard = this.currentData();
    this.parentBoard = new ReactiveVar(null);
    this.parentCard = this.currentCard.parentCard();
    if (this.parentCard) {
      const list = $('.js-field-parent-card');
      list.val(this.parentCard._id);
      this.parentBoard.set(this.parentCard.board()._id);
    } else {
      this.parentBoard.set(null);
    }
  },

  boards() {
    const boards = Boards.find({
      archived: false,
      'members.userId': Meteor.userId(),
      _id: {
        $ne: Meteor.user().getTemplatesBoardId(),
      },
    }, {
      sort: ['title'],
    });
    return boards;
  },

  cards() {
    const currentId = Session.get('currentCard');
    if (this.parentBoard.get()) {
      return Cards.find({
        boardId: this.parentBoard.get(),
        _id: {$ne: currentId},
      });
    } else {
      return [];
    }
  },

  isParentBoard() {
    const board = this.currentData();
    if (this.parentBoard.get()) {
      return board._id === this.parentBoard.get();
    }
    return false;
  },

  isParentCard() {
    const card = this.currentData();
    if (this.parentCard) {
      return card._id === this.parentCard;
    }
    return false;
  },

  setParentCardId(cardId) {
    if (cardId) {
      this.parentCard = Cards.findOne(cardId);
    } else {
      this.parentCard = null;
    }
    this.currentCard.setParentId(cardId);
  },

  events() {
    return [{
      'click .js-copy-card-link-to-clipboard' () {
        // Clipboard code from:
        // https://stackoverflow.com/questions/6300213/copy-selected-text-to-the-clipboard-without-using-flash-must-be-cross-browser
        const StringToCopyElement = document.getElementById('cardURL');
        StringToCopyElement.select();
        if (document.execCommand('copy')) {
          StringToCopyElement.blur();
        } else {
          document.getElementById('cardURL').selectionStart = 0;
          document.getElementById('cardURL').selectionEnd = 999;
          document.execCommand('copy');
          if (window.getSelection) {
            if (window.getSelection().empty) { // Chrome
              window.getSelection().empty();
            } else if (window.getSelection().removeAllRanges) { // Firefox
              window.getSelection().removeAllRanges();
            }
          } else if (document.selection) { // IE?
            document.selection.empty();
          }
        }
      },
      'click .js-delete': Popup.afterConfirm('cardDelete', function () {
        Popup.close();
        Cards.remove(this._id);
        Utils.goBoardId(this.boardId);
      }),
      'change .js-field-parent-board'(evt) {
        const selection = $(evt.currentTarget).val();
        const list = $('.js-field-parent-card');
        if (selection === 'none') {
          this.parentBoard.set(null);
        } else {
          subManager.subscribe('board', $(evt.currentTarget).val(), false);
          this.parentBoard.set(selection);
          list.prop('disabled', false);
        }
        this.setParentCardId(null);
      },
      'change .js-field-parent-card'(evt) {
        const selection = $(evt.currentTarget).val();
        this.setParentCardId(selection);
      },
    }];
  },
}).register('cardMorePopup');


// Close the card details pane by pressing escape
EscapeActions.register('detailsPane',
  () => {
    Utils.goBoardId(Session.get('currentBoard'));
  },
  () => {
    return !Session.equals('currentCard', null);
  }, {
    noClickEscapeOn: '.js-card-details,.board-sidebar,#header',
  }
);
