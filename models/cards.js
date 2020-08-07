Cards = new Mongo.Collection('cards');

// XXX To improve pub/sub performances a card document should include a
// de-normalized number of comments so we don't have to publish the whole list
// of comments just to display the number of them in the board view.
Cards.attachSchema(new SimpleSchema({
  title: {
    /**
     * the title of the card
     */
    type: String,
    optional: true,
    defaultValue: '',
  },
  archived: {
    /**
     * is the card archived
     */
    type: Boolean,
    autoValue() { // eslint-disable-line consistent-return
      if (this.isInsert && !this.isSet) {
        return false;
      }
    },
  },
  parentId: {
    /**
     * ID of the parent card
     */
    type: String,
    optional: true,
    defaultValue: '',
  },
  listId: {
    /**
     * List ID where the card is
     */
    type: String,
    optional: true,
    defaultValue: '',
  },
  swimlaneId: {
    /**
     * Swimlane ID where the card is
     */
    type: String,
    optional: true,
    defaultValue: '',
  },
  // The system could work without this `boardId` information (we could deduce
  // the board identifier from the card), but it would make the system more
  // difficult to manage and less efficient.
  boardId: {
    /**
     * Board ID of the card
     */
    type: String,
    optional: true,
    defaultValue: '',
  },
  coverId: {
    /**
     * Cover ID of the card
     */
    type: String,
    optional: true,
    defaultValue: '',

  },
  color: {
    type: String,
    optional: true,
    allowedValues: [
      'white', 'green', 'yellow', 'orange', 'red', 'purple',
      'blue', 'sky', 'lime', 'pink', 'black',
      'silver', 'peachpuff', 'crimson', 'plum', 'darkgreen',
      'slateblue', 'magenta', 'gold', 'navy', 'gray',
      'saddlebrown', 'paleturquoise', 'mistyrose', 'indigo',
    ],
  },
  createdAt: {
    /**
     * creation date
     */
    type: Date,
    autoValue() { // eslint-disable-line consistent-return
      if (this.isInsert) {
        return new Date();
      } else {
        this.unset();
      }
    },
  },
  customFields: {
    /**
     * list of custom fields
     */
    type: [Object],
    optional: true,
    defaultValue: [],
  },
  'customFields.$': {
    type: new SimpleSchema({
      _id: {
        /**
         * the ID of the related custom field
         */
        type: String,
        optional: true,
        defaultValue: '',
      },
      value: {
        /**
         * value attached to the custom field
         */
        type: Match.OneOf(String, Number, Boolean, Date),
        optional: true,
        defaultValue: '',
      },
    }),
  },
  dateLastActivity: {
    /**
     * Date of last activity
     */
    type: Date,
    autoValue() {
      return new Date();
    },
  },
  initialScore: {
    type: String,
    optional: true,
  },
  endScore: {
    type: String,
    optional: true,
  },
  currentScore: {
    type: String,
    optional: true,
  },
  targetScore: {
    type: String,
    optional: true,
  },
  description: {
    /**
     * description of the card
     */
    type: String,
    optional: true,
    defaultValue: '',
  },
  requestedBy: {
    /**
     * who requested the card (ID of the user)
     */
    type: String,
    optional: true,
    defaultValue: '',
  },
  assignedBy: {
    /**
     * who assigned the card (ID of the user)
     */
    type: String,
    optional: true,
    defaultValue: '',
  },
  labelIds: {
    /**
     * list of labels ID the card has
     */
    type: [String],
    optional: true,
    defaultValue: [],
  },
  members: {
    /**
     * list of members (user IDs)
     */
    type: [String],
    optional: true,
    defaultValue: [],
  },
  team_members: {
    /**
     * list of team members (user IDs)
     *
     * Users that are not members of a board can be added as a team,
     * without giving them permissions to view the board or the card
     */
    type: [String],
    optional: true,
    defaultValue: [],
  },
  receivedAt: {
    /**
     * Date the card was received
     */
    type: Date,
    optional: true,
  },
  startAt: {
    /**
     * Date the card was started to be worked on
     */
    type: Date,
    optional: true,
  },
  dueAt: {
    /**
     * Date the card is due
     */
    type: Date,
    optional: true,
  },
  endAt: {
    /**
     * Date the card ended
     */
    type: Date,
    optional: true,
  },
  spentTime: {
    /**
     * How much time has been spent on this
     */
    type: Number,
    decimal: true,
    optional: true,
    defaultValue: 0,
  },
  isOvertime: {
    /**
     * is the card over time?
     */
    type: Boolean,
    defaultValue: false,
    optional: true,
  },
  // XXX Should probably be called `authorId`. Is it even needed since we have
  // the `members` field?
  userId: {
    /**
     * user ID of the author of the card
     */
    type: String,
    autoValue() { // eslint-disable-line consistent-return
      if (this.isInsert && !this.isSet) {
        return this.userId;
      }
    },
  },
  sort: {
    /**
     * Sort value
     */
    type: Number,
    decimal: true,
    defaultValue: '',
  },
  subtaskSort: {
    /**
     * subtask sort value
     */
    type: Number,
    decimal: true,
    defaultValue: -1,
    optional: true,
  },
  type: {
    /**
     * type of the card
     */
    type: String,
    defaultValue: 'cardType-card',
  },
  linkedId: {
    /**
     * ID of the linked card
     */
    type: String,
    optional: true,
    defaultValue: '',
  },
	aspectsListId: {
    type: String,
    optional: true,
  },
}));

Cards.allow({
  insert(userId, doc) {
    return allowIsBoardMember(userId, Boards.findOne(doc.boardId));
  },
  update(userId, doc) {
    return true;
  },
  remove(userId, doc) {
    return allowIsBoardMember(userId, Boards.findOne(doc.boardId));
  },
  fetch: [],
});

Cards.helpers({
  copy(boardId, swimlaneId, listId) {
    const oldBoard = Boards.findOne(this.boardId);
    const oldBoardLabels = oldBoard.labels;
    // Get old label names
    const oldCardLabels = _.pluck(_.filter(oldBoardLabels, (label) => {
      return _.contains(this.labelIds, label._id);
    }), 'name');

    const newBoard = Boards.findOne(boardId);
    const newBoardLabels = newBoard.labels;
    const newCardLabels = _.pluck(_.filter(newBoardLabels, (label) => {
      return _.contains(oldCardLabels, label.name);
    }), '_id');

    const oldId = this._id;
    const oldCard = Cards.findOne(oldId);

    // Copy Custom Fields
    if (oldBoard._id !== boardId) {
      CustomFields.find({
        _id: {$in: oldCard.customFields.map((cf) => { return cf._id; })},
      }).forEach((cf) => {
        if (!_.contains(cf.boardIds, boardId))
          cf.addBoard(boardId);
      });
    }

    delete this._id;
    delete this.labelIds;
    this.labelIds = newCardLabels;
    this.boardId = boardId;
    this.swimlaneId = swimlaneId;
    this.listId = listId;
    const _id = Cards.insert(this);

    // Copy attachments
    oldCard.attachments().forEach((att) => {
      att.cardId = _id;
      delete att._id;
      return Attachments.insert(att);
    });

    // copy checklists
    Checklists.find({cardId: oldId}).forEach((ch) => {
      ch.copy(_id);
    });

    // copy subtasks
    Cards.find({parentId: oldId}).forEach((subtask) => {
      subtask.parentId = _id;
      subtask._id = null;
      Cards.insert(subtask);
    });

    // copy card comments
    CardComments.find({cardId: oldId}).forEach((cmt) => {
      cmt.copy(_id);
    });

    return _id;
  },

  list() {
    return Lists.findOne(this.listId);
  },

  board() {
    return Boards.findOne(this.boardId);
  },

  labels() {
    const boardLabels = this.board().labels;
    const cardLabels = _.filter(boardLabels, (label) => {
      return _.contains(this.labelIds, label._id);
    });
    return cardLabels;
  },

  hasLabel(labelId) {
    return _.contains(this.labelIds, labelId);
  },

  user() {
    return Users.findOne(this.userId);
  },

  isAssigned(memberId) {
    return _.contains(this.getMembers(), memberId);
  },

  activities() {
    if (this.isLinkedCard()) {
      return Activities.find({cardId: this.linkedId}, {sort: {createdAt: -1}});
    } else if (this.isLinkedBoard()) {
      return Activities.find({boardId: this.linkedId}, {sort: {createdAt: -1}});
    } else {
      return Activities.find({cardId: this._id}, {sort: {createdAt: -1}});
    }
  },

  comments() {
    if (this.isLinkedCard()) {
      return CardComments.find({cardId: this.linkedId}, {sort: {createdAt: -1}});
    } else {
      return CardComments.find({cardId: this._id}, {sort: {createdAt: -1}});
    }
  },

  attachments() {
    if (this.isLinkedCard()) {
      return Attachments.find({cardId: this.linkedId}, {sort: {uploadedAt: -1}});
    } else {
      return Attachments.find({cardId: this._id}, {sort: {uploadedAt: -1}});
    }
  },

  cover() {
    const cover = Attachments.findOne(this.coverId);
    // if we return a cover before it is fully stored, we will get errors when we try to display it
    // todo XXX we could return a default "upload pending" image in the meantime?
    return cover && cover.url() && cover;
  },

  checklists() {
    if (this.isLinkedCard()) {
      return Checklists.find({cardId: this.linkedId}, {sort: { sort: 1 } });
    } else {
      return Checklists.find({cardId: this._id}, {sort: { sort: 1 } });
    }
  },

  checklistItemCount() {
    const checklists = this.checklists().fetch();
    return checklists.map((checklist) => {
      return checklist.itemCount();
    }).reduce((prev, next) => {
      return prev + next;
    }, 0);
  },

  checklistFinishedCount() {
    const checklists = this.checklists().fetch();
    return checklists.map((checklist) => {
      return checklist.finishedCount();
    }).reduce((prev, next) => {
      return prev + next;
    }, 0);
  },

  checklistFinished() {
    return this.hasChecklist() && this.checklistItemCount() === this.checklistFinishedCount();
  },

  hasChecklist() {
    return this.checklistItemCount() !== 0;
  },

  subtasks() {
    return Cards.find({
      parentId: this._id,
      archived: false,
    }, {
      sort: {
        sort: 1,
      },
    });
  },

  allSubtasks() {
    return Cards.find({
      parentId: this._id,
      archived: false,
    }, {
      sort: {
        sort: 1,
      },
    });
  },

  subtasksCount() {
    return Cards.find({
      parentId: this._id,
      archived: false,
    }).count();
  },

  subtasksFinishedCount() {
    return Cards.find({
      parentId: this._id,
      archived: true,
    }).count();
  },

  subtasksFinished() {
    const finishCount = this.subtasksFinishedCount();
    return finishCount > 0 && this.subtasksCount() === finishCount;
  },

  allowsSubtasks() {
    return this.subtasksCount() !== 0;
  },

  customFieldIndex(customFieldId) {
    return _.pluck(this.customFields, '_id').indexOf(customFieldId);
  },

  // customFields with definitions
  customFieldsWD() {

    // get all definitions
    const definitions = CustomFields.find({
      boardIds: {$in: [this.boardId]},
    }).fetch();

    // match right definition to each field
    if (!this.customFields) return [];
    return this.customFields.map((customField) => {
      const definition = definitions.find((definition) => {
        return definition._id === customField._id;
      });
      if (!definition) {
        return {};
      }
      //search for "True Value" which is for DropDowns other then the Value (which is the id)
      let trueValue = customField.value;
      if (definition && definition.settings && definition.settings.dropdownItems && definition.settings.dropdownItems.length > 0) {
        for (let i = 0; i < definition.settings.dropdownItems.length; i++) {
          if (definition.settings.dropdownItems[i]._id === customField.value) {
            trueValue = definition.settings.dropdownItems[i].name;
          }
        }
      }
      return {
        _id: customField._id,
        value: customField.value,
        trueValue,
        definition,
      };
    });
  },

  colorClass() {
    if (this.color)
      return this.color;
    return '';
  },

  absoluteUrl() {
    const board = this.board();
    return FlowRouter.url('card', {
      boardId: board._id,
      slug: board.slug,
      cardId: this._id,
    });
  },

  canBeRestored() {
    const list = Lists.findOne({
      _id: this.listId,
    });
    if (!list.getWipLimit('soft') && list.getWipLimit('enabled') && list.getWipLimit('value') === list.cards().count()) {
      return false;
    }
    return true;
  },

  parentCard() {
    if (this.parentId === '') {
      return null;
    }
    return Cards.findOne(this.parentId);
  },

  parentCardName() {
    let result = '';
    if (this.parentId !== '') {
      const card = Cards.findOne(this.parentId);
      if (card) {
        result = card.title;
      }
    }
    return result;
  },

  parentListId() {
    const result = [];
    let crtParentId = this.parentId;
    while (crtParentId !== '') {
      const crt = Cards.findOne(crtParentId);
      if ((crt === null) || (crt === undefined)) {
        // maybe it has been deleted
        break;
      }
      if (crtParentId in result) {
        // circular reference
        break;
      }
      result.unshift(crtParentId);
      crtParentId = crt.parentId;
    }
    return result;
  },

  parentList() {
    const resultId = [];
    const result = [];
    let crtParentId = this.parentId;
    while (crtParentId !== '') {
      const crt = Cards.findOne(crtParentId);
      if ((crt === null) || (crt === undefined)) {
        // maybe it has been deleted
        break;
      }
      if (crtParentId in resultId) {
        // circular reference
        break;
      }
      resultId.unshift(crtParentId);
      result.unshift(crt);
      crtParentId = crt.parentId;
    }
    return result;
  },

  parentString(sep) {
    return this.parentList().map(function(elem) {
      return elem.title;
    }).join(sep);
  },

  isTopLevel() {
    return this.parentId === '';
  },

  isLinkedCard() {
    return this.type === 'cardType-linkedCard';
  },

  isLinkedBoard() {
    return this.type === 'cardType-linkedBoard';
  },

  isLinked() {
    return this.isLinkedCard() || this.isLinkedBoard();
  },

  setDescription(description) {
    if (this.isLinkedCard()) {
      return Cards.update({_id: this.linkedId}, {$set: {description}});
    } else if (this.isLinkedBoard()) {
      return Boards.update({_id: this.linkedId}, {$set: {description}});
    } else {
      return Cards.update(
        {_id: this._id},
        {$set: {description}}
      );
    }
  },

  getDescription() {
    if (this.isLinkedCard()) {
      const card = Cards.findOne({_id: this.linkedId});
      if (card && card.description)
        return card.description;
      else
        return null;
    } else if (this.isLinkedBoard()) {
      const board = Boards.findOne({_id: this.linkedId});
      if (board && board.description)
        return board.description;
      else
        return null;
    } else if (this.description) {
      return this.description;
    } else {
      return null;
    }
  },

  checkIfAnyInexistantUser () {
    const isNotLinkedCardNorIsLinkedBoard = !this.isLinkedCard() && !this.isLinkedBoard();
    if (this.isLinkedCard() || isNotLinkedCardNorIsLinkedBoard) {
      var cardIdentifier = '';
      if (this.isLinkedCard()) {
        cardIdentifier = this.linkedId;
      } else if (!this.isLinkedBoard()) {
        cardIdentifier = this._id;
      }

      const card = Cards.findOne({_id: cardIdentifier});
      if (card && card._id) {
        for (var i = 0; i < card.members.length; i++) {
          const users = Users.find({ _id: card.members[i] });
          if (users.count() < 1) {
            Cards.update(
              { _id: card._id },
              { $pull: { members: card.members[i] }}
            );
          }
        }
      }
    } else if (this.isLinkedBoard()) {
      const board = Boards.findOne({_id: this.linkedId});
      if (board && board._id) {
        for (var i = 0; i < board.members.length; i++) {
          const users = Users.find({ _id: board.members[i].userId });
          if (users.count() < 1) {
            Boards.update(
              { _id: this.linkedId },
              { $pull: { members: board.members[i].userId }}
            );
          }
        }
      }
    }
  },

  getMembers() {
    this.checkIfAnyInexistantUser();

    if (this.isLinkedCard()) {
      const card = Cards.findOne({_id: this.linkedId});
      return card.members;
    } else if (this.isLinkedBoard()) {
      const board = Boards.findOne({_id: this.linkedId});
      return board.activeMembers().map((member) => {
        member.userId;
      });
    } else {
      return this.members;
    }
  },

  getTeamMembers() {
  	var card;
    if (this.isLinkedCard() && !this.isLinkedBoard()) {
      card = Cards.findOne({_id: this.linkedId});
    } else if (!this.isLinkedCard() && !this.isLinkedBoard()) {
      card = Cards.findOne({_id: this._id});
    }
    if (card && card.team_members) {
      return card.team_members;
    } else {
    	return null;
    }
  },

  // *** Note: team member is a user that is not a member of the board. He cannot view the board or the card ***
  // For the feature Team's functionality of adding and displaying team members on the card, the back-end needs to return the
  // users that the logged in user can add as a 'Team member' to the card excluding the ones that are already the board's or the team's member.
  // So basically the users to return is going to be the same as the users of the roles we send to the 'Roles' drop-down list options
  // based on the logged in user's role EXCEPT that we need to remove the users that are members of the board or the card's team
  getTeamUsers() {
  	var board;
    var cardId;
    if (this.isLinkedCard() && !this.isLinkedBoard()) {
      cardId = this.linkedId;
    } else if (!this.isLinkedCard() && !this.isLinkedBoard()) {
      cardId = this._id;
    }

    var boardMembers;
  	var memberIds = new Array();
    var users;

    const card = Cards.findOne(cardId);
    if (card && card.boardId) {
      board = Boards.findOne({ _id: card.boardId });
    	boardMembers = board.activeMembers();
    	boardMembers.forEach((boardMember) => {
    		memberIds.push(boardMember.userId);
    	});
    	var teamMembers = this.getTeamMembers();
    	if (teamMembers && teamMembers.length > 0) {
      	teamMembers.forEach((teamMember) => {
      		memberIds.push(teamMember.userId);
      	});
    	}

      // if isAdmin, first get users of any of the roles
      if (Meteor.user().isAdmin) {
        users = Users.find({ _id: {$nin: memberIds} });
      }

      // if isManagerAndNotAdmin, first get users of the roles 'coach' or 'coachee'
      const manager = Roles.findOne({ name: 'Manager' });
      if (manager) {
        const isManagerAndNotAdmin = Users.findOne({ _id: Meteor.user()._id, roleId: manager._id, isAdmin: false });
        if (isManagerAndNotAdmin) {
        	const roles = Roles.find({ $or: [{ name: 'Coach' }, { name: 'Coachee' }] });
          if (roles.count() > 0) {
          	var roleIds = new Array();
          	roles.forEach((role) => {
          		roleIds.push(role._id);
          	});
          	users = Users.find({
          		_id: { $nin: memberIds },
          		roleId: {$in: roleIds},
          	});
          }
        }
      }

      // if isCoachAndNotAdmin, first get users of the role 'coachee'
      const coach = Roles.findOne({ name: 'Coach' });
      if (coach) {
        const isCoachAndNotAdmin = Users.findOne({
        	_id: Meteor.user()._id,
        	roleId: coach._id,
        	$or: [
        		{ isAdmin: { $exists: false } },
        		{ isAdmin: false }
    			]
      	});

        if (isCoachAndNotAdmin) {
        	const role = Roles.findOne({ name: 'Coachee' });
          if (role && role._id) {
          	users = Users.find({
          		_id: { $nin: memberIds },
          		roleId: role._id,
        		});
          }
        }
      }
    }

 	  return users;
  },

  assignMember(memberId) {
    if (this.isLinkedCard()) {
      return Cards.update(
        { _id: this.linkedId },
        { $addToSet: { members: memberId }}
      );
    } else if (this.isLinkedBoard()) {
      const board = Boards.findOne({_id: this.linkedId});
      return board.addMember(memberId);
    } else {
      return Cards.update(
        { _id: this._id },
        { $addToSet: { members: memberId}}
      );
    }
  },

  unassignMember(memberId) {
    if (this.isLinkedCard()) {
      return Cards.update(
        { _id: this.linkedId },
        { $pull: { members: memberId }}
      );
    } else if (this.isLinkedBoard()) {
      const board = Boards.findOne({_id: this.linkedId});
      return board.removeMember(memberId);
    } else {
      return Cards.update(
        { _id: this._id },
        { $pull: { members: memberId}}
      );
    }
  },

  assignTeamMember(teamMemberId) {
    var cardId = '';
    if (this.isLinkedCard() && !this.isLinkedBoard()) {
      cardId = this.linkedId;
      Cards.update(
        { _id: cardId },
        { $addToSet: { team_members: teamMemberId }}
      );
    } else if (!this.isLinkedCard() && !this.isLinkedBoard()) {
      cardId = this._id;
      Cards.update(
        { _id: cardId },
        { $addToSet: { team_members: teamMemberId}}
      );
    }

    TeamMembersScores.insert({
      userId: teamMemberId,
      cardId
    });

    const card = Cards.findOne({_id: cardId});
    if (card && card._id) {
      const teamMembersCount = card.team_members.length;

      AspectsListItems.find({cardId}).forEach((aspect) => {
        TeamMembersAspects.insert({
          userId: teamMemberId,
          cardId,
          aspectsId: aspect._id,
        });

        if (teamMembersCount == 1) {
          AspectsListItems.update(
            { _id: aspect._id }, 
            { $set: {
              initialScore: '',
              currentScore: ''
            } }
          );
        }
      });

      return true;
    }
  },

  unassignTeamMember(teamMemberId) {
    var cardId = '';
    if (this.isLinkedCard() && !this.isLinkedBoard()) {
      cardId = this.linkedId;
      Cards.update(
        { _id: cardId },
        { $pull: { team_members: teamMemberId }}
      );
    } else if (!this.isLinkedCard() && !this.isLinkedBoard()) {
      cardId = this._id;
      Cards.update(
        { _id: cardId },
        { $pull: { team_members: teamMemberId}}
      );
    }

    const teamScore = TeamMembersScores.findOne({ userId: teamMemberId, cardId });
    if (teamScore && teamScore._id) {
      TeamMembersScores.remove({_id: teamScore._id});
    }

    var idsToRemove = new Array();
    TeamMembersAspects.find({cardId, userId: teamMemberId}).forEach((teamMemberAspect) => {
      idsToRemove.push(teamMemberAspect._id);
    });

    for (var i = 0; i < idsToRemove.length; i++) {
      TeamMembersAspects.remove({_id: idsToRemove[i]});
    }

    // Recalculate the TeamMembersScores in both scenarios
    // (i)  card has only team member(s) remaining or
    // (ii) card has both team member(s) and aspect(s) remaining
    // Then add the team members scores to get the composed initial/current scores
    // and update the card's initial/current scores
    const card = Cards.findOne(cardId);
    if (card && card._id) {
      const teamMembers = card.team_members;
      teamMembers.forEach((teamMember) => {
        var teamMemberInitialScore = 0;
        var teamMemberCurrentScore = 0;
        const teamMembersAspects = TeamMembersAspects.find({ userId: teamMember, cardId });
        if (teamMembersAspects.count() > 0) {
          teamMembersAspects.forEach((teamMemberAspect) => {
            if (teamMemberAspect.initialScore) {
              var initialScore = parseFloat(teamMemberAspect.initialScore);
              if (initialScore > 0) {
                teamMemberInitialScore += initialScore;
              }
            }
            if (teamMemberAspect.currentScore) {
              var currentScore = parseFloat(teamMemberAspect.currentScore);
              if (currentScore > 0) {
                teamMemberCurrentScore += currentScore;
              }
            }
          });
          const teamMemberScore = TeamMembersScores.findOne({ userId: teamMember, cardId });
          if (teamMemberScore && teamMemberScore._id) {
            TeamMembersScores.update(
              { _id: teamMemberScore._id },
              { $set: {
                initialScore: teamMemberInitialScore.toFixed(2).toString(),
                currentScore: teamMemberCurrentScore.toFixed(2).toString()
              } }
            );
          }
        }
      });

      const teamMembersScores = TeamMembersScores.find({ cardId });
      if (teamMembersScores.count() > 0) {
        var totalTeamMembersInitialScores = 0;
        var totalTeamMembersCurrentScores = 0;
        teamMembersScores.forEach((teamMemberScore) => {
          if (teamMemberScore.initialScore) {
            var teamMemberInitialScore = parseFloat(teamMemberScore.initialScore);
            if (teamMemberInitialScore > 0) {
              totalTeamMembersInitialScores += teamMemberInitialScore;
            }
          }
          if (teamMemberScore.currentScore) {
            var teamMemberCurrentScore = parseFloat(teamMemberScore.currentScore);
            if (teamMemberCurrentScore > 0) {
              totalTeamMembersCurrentScores += teamMemberCurrentScore;
            }
          }
        });

        card.setInitialScore(totalTeamMembersInitialScores.toFixed(2).toString());
        card.setCurrentScore(totalTeamMembersCurrentScores.toFixed(2).toString());
      }
    }

    return true;
  },

  toggleMember(memberId) {
    if (this.getMembers() && this.getMembers().indexOf(memberId) > -1) {
      return this.unassignMember(memberId);
    } else {
      return this.assignMember(memberId);
    }
  },

  toggleTeamMember(teamMemberId) {
    if (this.getTeamMembers() && this.getTeamMembers().indexOf(teamMemberId) > -1) {
      return this.unassignTeamMember(teamMemberId);
    } else {
      return this.assignTeamMember(teamMemberId);
    }
  },

  getReceived() {
    if (this.isLinkedCard()) {
      const card = Cards.findOne({_id: this.linkedId});
      return card.receivedAt;
    } else {
      return this.receivedAt;
    }
  },

  setReceived(receivedAt) {
    if (this.isLinkedCard()) {
      return Cards.update(
        {_id: this.linkedId},
        {$set: {receivedAt}}
      );
    } else {
      return Cards.update(
        {_id: this._id},
        {$set: {receivedAt}}
      );
    }
  },

  getStart() {
    let startAt = this.startAt;
    let card = this;
    if (this.isLinkedCard()) {
      card = Cards.findOne({_id: this.linkedId});
      startAt = card.startAt;
    } else if (this.isLinkedBoard()) {
      const board = Boards.findOne({_id: this.linkedId});
      startAt = board.startAt;
    }
    let lastScores = CardScores.find({type: 'current', 'cardId': card._id, 'date': {$lte: new Date(new Date().setHours(23,59,59,999))}}, {sort:{date: -1}, limit: 1}).fetch();
    if (lastScores.length > 0 && startAt) {
      startAt = lastScores[0].date;
    }
    if (card.dataPointDate) {
      startAt = card.dataPointDate;
    }
    return startAt;
  },

  setStart(startAt) {
    if (this.isLinkedCard()) {
      return Cards.update(
        { _id: this.linkedId },
        {$set: {startAt}}
      );
    } else if (this.isLinkedBoard()) {
      return Boards.update(
        {_id: this.linkedId},
        {$set: {startAt}}
      );
    } else {
      return Cards.update(
        {_id: this._id},
        {$set: {startAt}}
      );
    }
  },

  getDue() {
    if (this.isLinkedCard()) {
      const card = Cards.findOne({_id: this.linkedId});
      return card.dueAt;
    } else if (this.isLinkedBoard()) {
      const board = Boards.findOne({_id: this.linkedId});
      return board.dueAt;
    } else if (this.dataPointDate) {
      return this.dataPointDate;
    } else {
      var dueDate = null;
      let futureScores = CardScores.find({type: 'target', cardId: this._id, date: {$gte: new Date(new Date().setHours(0,0,0,0))}}, {sort:{date: 1}, limit: 1}).fetch();
      if (futureScores.length > 0) {
        return dueDate = futureScores[0].date;
      } else {
        return this.dueAt;
      }
    }

  },

  setDue(dueAt) {
    if (this.isLinkedCard()) {
      return Cards.update(
        { _id: this.linkedId },
        {$set: {dueAt}}
      );
    } else if (this.isLinkedBoard()) {
      return Boards.update(
        {_id: this.linkedId},
        {$set: {dueAt}}
      );
    } else {
      return Cards.update(
        {_id: this._id},
        {$set: {dueAt}}
      );
    }
  },

  getEnd() {
    if (this.isLinkedCard()) {
      const card = Cards.findOne({_id: this.linkedId});
      return card.endAt;
    } else if (this.isLinkedBoard()) {
      const board = Boards.findOne({_id: this.linkedId});
      return board.endAt;
    } else {
      return this.endAt;
    }
  },

  setEnd(endAt) {
    if (this.isLinkedCard()) {
      return Cards.update(
        { _id: this.linkedId },
        {$set: {endAt}}
      );
    } else if (this.isLinkedBoard()) {
      return Boards.update(
        {_id: this.linkedId},
        {$set: {endAt}}
      );
    } else {
      return Cards.update(
        {_id: this._id},
        {$set: {endAt}}
      );
    }
  },

  getIsOvertime() {
    if (this.isLinkedCard()) {
      const card = Cards.findOne({ _id: this.linkedId });
      return card.isOvertime;
    } else if (this.isLinkedBoard()) {
      const board = Boards.findOne({ _id: this.linkedId});
      return board.isOvertime;
    } else {
      return this.isOvertime;
    }
  },

  setIsOvertime(isOvertime) {
    if (this.isLinkedCard()) {
      return Cards.update(
        { _id: this.linkedId },
        {$set: {isOvertime}}
      );
    } else if (this.isLinkedBoard()) {
      return Boards.update(
        {_id: this.linkedId},
        {$set: {isOvertime}}
      );
    } else {
      return Cards.update(
        {_id: this._id},
        {$set: {isOvertime}}
      );
    }
  },

  getSpentTime() {
    if (this.isLinkedCard()) {
      const card = Cards.findOne({ _id: this.linkedId });
      return card.spentTime;
    } else if (this.isLinkedBoard()) {
      const board = Boards.findOne({ _id: this.linkedId});
      return board.spentTime;
    } else {
      return this.spentTime;
    }
  },

  setSpentTime(spentTime) {
    if (this.isLinkedCard()) {
      return Cards.update(
        { _id: this.linkedId },
        {$set: {spentTime}}
      );
    } else if (this.isLinkedBoard()) {
      return Boards.update(
        {_id: this.linkedId},
        {$set: {spentTime}}
      );
    } else {
      return Cards.update(
        {_id: this._id},
        {$set: {spentTime}}
      );
    }
  },

  getId() {
    if (this.isLinked()) {
      return this.linkedId;
    } else {
      return this._id;
    }
  },

  getTitle() {
    if (this.isLinkedCard()) {
      const card = Cards.findOne({ _id: this.linkedId });
      return card.title;
    } else if (this.isLinkedBoard()) {
      const board = Boards.findOne({ _id: this.linkedId});
      return board.title;
    } else {
      return this.title;
    }
  },

  getBoardTitle() {
    if (this.isLinkedCard()) {
      const card = Cards.findOne({ _id: this.linkedId });
      const board = Boards.findOne({ _id: card.boardId });
      return board.title;
    } else if (this.isLinkedBoard()) {
      const board = Boards.findOne({ _id: this.linkedId});
      return board.title;
    } else {
      const board = Boards.findOne({ _id: this.boardId });
      return board.title;
    }
  },

  setTitle(title) {
    if (this.isLinkedCard()) {
      return Cards.update(
        { _id: this.linkedId },
        {$set: {title}}
      );
    } else if (this.isLinkedBoard()) {
      return Boards.update(
        {_id: this.linkedId},
        {$set: {title}}
      );
    } else {
      return Cards.update(
        {_id: this._id},
        {$set: {title}}
      );
    }
  },

  setInitialScore(initialScore) {
    let cardId = this._id;
    if (this.isLinkedCard()) {
      cardId = this.linkedId;
    }
    return Cards.update(
      {_id: cardId},
      {$set: {'initialScore': initialScore}}
    );
  },

  getInitialScore() {
    let card = this;
    if (this.isLinkedCard()) {
      card = Cards.findOne({ _id: this.linkedId });
    }
    if (card.initialScore && this.isPropertyVisible('card-received-score-title')) {
      return card.initialScore;
    } else {
      return null;
    }
  },

  setEndScore(endScore) {
    let cardId = this._id;
    if (this.isLinkedCard()) {
        cardId = this.linkedId;
    }
    return Cards.update(
      {_id: cardId},
      {$set: {'endScore': endScore}}
    );
  },

  getEndScore() {
    let card = this;
    if (this.isLinkedCard()) {
      card = Cards.findOne({ _id: this.linkedId });
    }
    if (card.endScore && this.isPropertyVisible('card-end-score-title')) {
      return card.endScore;
    } else {
      return null;
    }
  },

  scores() {
    return CardScores.find({ cardId: this._id }, {sort: {date: 1}});
  },

  setCurrentScore(currentScore) {
    const card = Cards.findOne(this._id);
    if (this.isLinkedCard()) {
      card = Cards.findOne(this.linkedId);
    }

    let lastDateStart = new Date(card.startAt);
    let lastDateEnd = new Date(card.startAt);
    lastDateStart.setHours(0,0,0,0);
    lastDateEnd.setHours(23,59,59,999);
    Cards.update(
      {_id: card._id},
      {$set: {'currentScore': currentScore}}
    );

    // If currentScore is null it can be deleted from card and it should not affect historic scores
    // because it was this action was triggered directly from the button
    if (currentScore === null && !this.dataPointDate) {
      return true;
    }

    // If currentScore is null and the action was carried out from the popup that opened from
    // when a datapoint from the historic scores chart was clicked, then the datapoint needs to be removed
    if (currentScore === null && this.dataPointDate) {
      cardScoreDoc = CardScores.findOne({ date: this.dataPointDate, score: this.dataPointScore, type: 'current', cardId: this._id });
      if (typeof cardScoreDoc !== 'undefined') {
        CardScores.remove({ _id: cardScoreDoc._id });
      }
      return true;
    }

    // The following parts are for when there is any edit for the currentScore (to a real value)
    // or just creating a new currentScore (Keeping it in history too - by default)
    let lastScores = CardScores.find({type: 'current', 'cardId': card._id, 'date': {$gte: lastDateStart, $lte: lastDateEnd}}, {limit: 1}).fetch();
    if (lastScores.length > 0) {
      return CardScores.update({_id: lastScores[0]._id}, {$set: {'score': currentScore, 'date': card.startAt}});
    }
    
    if (!card.startAt) {
      return false;
    }

    return CardScores.insert({
      boardId: card.boardId,
      cardId: card._id,
      score: currentScore,
      type: 'current',
      date: card.startAt
    });
  },

  getCurrentScore() {
    let card = this;
    if (this.isLinkedCard()) {
      card = Cards.findOne({ _id: this.linkedId });
    }
    if (card.currentScore && this.isPropertyVisible('card-start-score-title')) {
      let lastScore = card.currentScore;
      let startAt = card.startAt;
      let lastScores = CardScores.find({type: 'current', 'cardId': card._id, 'date': {$lte: new Date(new Date().setHours(23,59,59,999))}}, {sort:{date: -1}, limit: 1}).fetch();
      if (lastScores.length > 0) {
        lastScore = lastScores[0].score
      }
      if (card.dataPointScore) {
        lastScore = card.dataPointScore;
      }
      return lastScore;
    } else {
      return null;
    }
  },

  setTargetScore(targetScore) {
    const card = Cards.findOne(this._id);
    if (this.isLinkedCard()) {
      card = Cards.findOne(this.linkedId);
    }

    let futureScores = CardScores.find({type: 'target', 'cardId': this._id, 'date': {$gte: new Date(new Date().setHours(0,0,0,0))}}, {sort:{date: 1}, limit: 1}).fetch();
    // If tried to delete from datapoint, replace the badge with the First Future Target Datapoint Details
    if (this.dataPointDate && futureScores.length > 0) {
      Cards.update({_id: card._id}, {$set: {'targetScore': futureScores[0].score}});
    } else {
      Cards.update({_id: card._id}, {$set: {'targetScore': targetScore}});
    }

    // If targetScore is null it can be deleted from card and it should not affect historic scores
    // because it was this action was triggered directly from the button
    if (targetScore === null && !this.dataPointDate) {
      return true;
    }

    // If targetScore is null and the action was carried out from the popup that opened from
    // when a datapoint from the historic scores chart was clicked, then the datapoint needs to be removed
    if (targetScore === null && this.dataPointDate) {
      cardScoreDoc = CardScores.findOne({ date: this.dataPointDate, score: this.dataPointScore, type: 'target', cardId: this._id });
      if (typeof cardScoreDoc !== 'undefined') {
        CardScores.remove({ _id: cardScoreDoc._id });
      }
      return true;
    }

    // The following parts are for when there is any edit for the targetScore (to a real value)
    // or just creating a new targetScore (Keeping it in history). If we already have a card_scores document(record) for
    // the specific date for this card then we update it, and if we did not have it, then we create we create a new one
    let dueDateStart = new Date(card.dueAt);
    let dueDateEnd = new Date(card.dueAt);
    dueDateStart.setHours(0, 0, 0, 0);
    dueDateEnd.setHours(23,59,59,999);
    let lastScore = CardScores.find({type: 'target', 'cardId': card._id, 'date': {$gte: dueDateStart, $lte: dueDateEnd}}, {limit: 1}).fetch();
    if (lastScore.length > 0) {
      return CardScores.update({_id: lastScore[0]._id}, {$set: {'score': targetScore, 'date': card.dueAt}});
    }
    return CardScores.insert({
      boardId: card.boardId,
      cardId: card._id,
      score: targetScore,
      type: 'target',
      date: card.dueAt
    });
  },

  getTargetScore() {
    let card = this;
    if (this.isLinkedCard()) {
      card = Cards.findOne({ _id: this.linkedId });
    }
    if (card.targetScore  && this.isPropertyVisible('card-due-score-title')) {
      if (card.dataPointScore) {
        return card.dataPointScore;
      }
      return card.targetScore;
    } else {
      return null;
    }
  },

  reloadHistoricScoreChart() {
    const cardScores = this.scores();
    if (this.isLinkedCard()) {
      const card = Cards.findOne({ _id: this.linkedId });
      cardScores = card.scores();
    }
    let labels = []
    let scores = {'current': [], 'target': []};
    let showChart = false;
    cardScores.forEach((cardScore) => {
    	if (cardScore && cardScore.score && cardScore.date) {
        labels.push(cardScore.date);
        var score = cardScore.score;
        if (typeof score === 'number') {
          score = score.toString();
        }
        scores[cardScore.type].push({x: cardScore.date, y: score.replace('%', '').trim(), pointId: cardScore._id});
        showChart = true;
    	}
    });
    if (cardScores.count() > 0 && scoreChart !== null) {
      scoreChart.data.labels = labels;
      scoreChart.data.datasets[0].data = scores.current;
      if (scoreChart.data.datasets && scoreChart.data.datasets[1] && scoreChart.data.datasets[1].data) {
        scoreChart.data.datasets[1].data = scores.target;
      }
      scoreChart.update();
      $('#historicScores').show();
    } else {
      $('#historicScores').hide();
    }

  	if (showChart) {
      $('#historicScores').show();
  	} else {
      $('#historicScores').hide();
  	}
  },

  getArchived() {
    if (this.isLinkedCard()) {
      const card = Cards.findOne({ _id: this.linkedId });
      return card.archived;
    } else if (this.isLinkedBoard()) {
      const board = Boards.findOne({ _id: this.linkedId});
      return board.archived;
    } else {
      return this.archived;
    }
  },

  setRequestedBy(requestedBy) {
    if (this.isLinkedCard()) {
      return Cards.update(
        { _id: this.linkedId },
        {$set: {requestedBy}}
      );
    } else {
      return Cards.update(
        {_id: this._id},
        {$set: {requestedBy}}
      );
    }
  },

  getRequestedBy() {
    if (this.isLinkedCard()) {
      const card = Cards.findOne({ _id: this.linkedId });
      return card.requestedBy;
    } else  {
      return this.requestedBy;
    }
  },

  setAssignedBy(assignedBy) {
    if (this.isLinkedCard()) {
      return Cards.update(
        { _id: this.linkedId },
        {$set: {assignedBy}}
      );
    } else {
      return Cards.update(
        {_id: this._id},
        {$set: {assignedBy}}
      );
    }
  },

  getAssignedBy() {
    if (this.isLinkedCard()) {
      const card = Cards.findOne({ _id: this.linkedId });
      return card.assignedBy;
    } else  {
      return this.assignedBy;
    }
  },

  isTemplateCard() {
    return this.type === 'template-card';
  },

  isPropertyVisible(key) {
    const property = ListProperties.findOne({listId: this.list()._id, i18nKey: key});
    let visible = true;
    if (typeof property !== 'undefined') {
      visible = property.visible;
    } else if (key == 'card-received-score-title' || key == 'card-start-score-title' || key == 'card-due-score-title' || key == 'card-end-score-title') {
      visible = false;
    }
    return visible;
  },

  getPropertyAlias(key) {
    const property = ListProperties.findOne({listId: this.list()._id, i18nKey: key});
    let alias = TAPi18n.__(key);
    if (typeof property !== 'undefined') {
      alias = property.alias;
    }
    return alias;
  },

  displayScores() {
    let card = this;
    if (this.isLinkedCard()) {
      card = Cards.findOne({ _id: this.linkedId });
    }
    let display = (typeof card.initialScore !== 'undefined' && card.initialScore > 0) || (typeof card.currentScore !== 'undefined' && card.currentScore > 0) || (typeof card.targetScore !== 'undefined' && card.targetScore > 0) || (typeof card.endScore !== 'undefined' && card.endScore > 0)
    return display;
  }
});

Cards.mutations({
  applyToChildren(funct) {
    Cards.find({
      parentId: this._id,
    }).forEach((card) => {
      funct(card);
    });
  },

  archive() {
    this.applyToChildren((card) => {
      return card.archive();
    });
    return {
      $set: {
        archived: true,
      },
    };
  },

  restore() {
    this.applyToChildren((card) => {
      return card.restore();
    });
    return {
      $set: {
        archived: false,
      },
    };
  },

  move(boardId, swimlaneId, listId, sort) {
    // Copy Custom Fields
    if (this.boardId !== boardId) {
      CustomFields.find({
        _id: {$in: this.customFields.map((cf) => { return cf._id; })},
      }).forEach((cf) => {
        if (!_.contains(cf.boardIds, boardId))
          cf.addBoard(boardId);
      });
    }

    // Get label names
    const oldBoard = Boards.findOne(this.boardId);
    const oldBoardLabels = oldBoard.labels;
    const oldCardLabels = _.pluck(_.filter(oldBoardLabels, (label) => {
      return _.contains(this.labelIds, label._id);
    }), 'name');

    const newBoard = Boards.findOne(boardId);
    const newBoardLabels = newBoard.labels;
    const newCardLabelIds = new Array();
    newBoardLabels.forEach((boardLabel) => {
    	if ($.inArray(boardLabel._id, this.labelIds) > -1) {
    		newCardLabelIds.push(boardLabel._id);
    	}
    });

    const mutatedFields = {
      boardId,
      swimlaneId,
      listId,
      sort,
      labelIds: newCardLabelIds,
    };

    Cards.update(this._id, {
      $set: mutatedFields,
    });
  },

  addLabel(labelId) {
    return {
      $addToSet: {
        labelIds: labelId,
      },
    };
  },

  removeLabel(labelId) {
    return {
      $pull: {
        labelIds: labelId,
      },
    };
  },

  toggleLabel(labelId) {
    if (this.labelIds && this.labelIds.indexOf(labelId) > -1) {
      return this.removeLabel(labelId);
    } else {
      return this.addLabel(labelId);
    }
  },

  setColor(newColor) {
    if (newColor === 'white') {
      newColor = null;
    }
    return {
      $set: {
        color: newColor,
      },
    };
  },

  assignMember(memberId) {
    return {
      $addToSet: {
        members: memberId,
      },
    };
  },

  unassignMember(memberId) {
    return {
      $pull: {
        members: memberId,
      },
    };
  },

  toggleMember(memberId) {
    if (this.members && this.members.indexOf(memberId) > -1) {
      return this.unassignMember(memberId);
    } else {
      return this.assignMember(memberId);
    }
  },

  assignCustomField(customFieldId) {
    return {
      $addToSet: {
        customFields: {
          _id: customFieldId,
          value: null,
        },
      },
    };
  },

  unassignCustomField(customFieldId) {
    return {
      $pull: {
        customFields: {
          _id: customFieldId,
        },
      },
    };
  },

  toggleCustomField(customFieldId) {
    if (this.customFields && this.customFieldIndex(customFieldId) > -1) {
      return this.unassignCustomField(customFieldId);
    } else {
      return this.assignCustomField(customFieldId);
    }
  },

  setCustomField(customFieldId, value) {
    // todo
    const index = this.customFieldIndex(customFieldId);
    if (index > -1) {
      const update = {
        $set: {},
      };
      update.$set[`customFields.${index}.value`] = value;
      return update;
    }
    // TODO
    // Ignatz 18.05.2018: Return null to silence ESLint. No Idea if that is correct
    return null;
  },

  setCover(coverId) {
    return {
      $set: {
        coverId,
      },
    };
  },

  unsetCover() {
    return {
      $unset: {
        coverId: '',
      },
    };
  },

  setReceived(receivedAt) {
    return {
      $set: {
        receivedAt,
      },
    };
  },

  unsetReceived() {
    return {
      $unset: {
        receivedAt: '',
      },
    };
  },

  setStart(startAt) {
    return {
      $set: {
        startAt,
      },
    };
  },

  unsetStart() {
    return {
      $unset: {
        startAt: '',
      },
    };
  },

  setDue(dueAt) {
    return {
      $set: {
        dueAt,
      },
    };
  },

  unsetDue() {
    return {
      $unset: {
        dueAt: '',
      },
    };
  },

  setEnd(endAt) {
    return {
      $set: {
        endAt,
      },
    };
  },

  unsetEnd() {
    return {
      $unset: {
        endAt: '',
      },
    };
  },

  setOvertime(isOvertime) {
    return {
      $set: {
        isOvertime,
      },
    };
  },

  setSpentTime(spentTime) {
    return {
      $set: {
        spentTime,
      },
    };
  },

  unsetSpentTime() {
    return {
      $unset: {
        spentTime: '',
        isOvertime: false,
      },
    };
  },

  setParentId(parentId) {
    return {
      $set: {
        parentId,
      },
    };
  },
});

//FUNCTIONS FOR creation of Activities

function updateActivities(doc, fieldNames, modifier) {
  if (_.contains(fieldNames, 'labelIds') && _.contains(fieldNames, 'boardId')) {
    Activities.find({
      activityType: 'addedLabel',
      cardId: doc._id,
    }).forEach((a) => {
      const lidx = doc.labelIds.indexOf(a.labelId);
      if (lidx !== -1 && modifier.$set.labelIds.length > lidx) {
        Activities.update(a._id, {
          $set: {
            labelId: modifier.$set.labelIds[doc.labelIds.indexOf(a.labelId)],
            boardId: modifier.$set.boardId,
          },
        });
      } else {
        Activities.remove(a._id);
      }
    });
  } else if (_.contains(fieldNames, 'boardId')) {
    Activities.remove({
      activityType: 'addedLabel',
      cardId: doc._id,
    });
  }
}

function cardMove(userId, doc, fieldNames, oldListId, oldSwimlaneId, oldBoardId) {
  if (_.contains(fieldNames, 'boardId') && (doc.boardId !== oldBoardId)) {
    Activities.insert({
      userId,
      activityType: 'moveCardBoard',
      boardName: Boards.findOne(doc.boardId).title,
      boardId: doc.boardId,
      oldBoardId,
      oldBoardName: Boards.findOne(oldBoardId).title,
      cardId: doc._id,
      swimlaneName: Swimlanes.findOne(doc.swimlaneId).title,
      swimlaneId: doc.swimlaneId,
      oldSwimlaneId,
    });
  } else if ((_.contains(fieldNames, 'listId') && doc.listId !== oldListId) ||
    (_.contains(fieldNames, 'swimlaneId') && doc.swimlaneId !== oldSwimlaneId)){
    Activities.insert({
      userId,
      oldListId,
      activityType: 'moveCard',
      listName: Lists.findOne(doc.listId).title,
      listId: doc.listId,
      boardId: doc.boardId,
      cardId: doc._id,
      cardTitle:doc.title,
      swimlaneName: Swimlanes.findOne(doc.swimlaneId).title,
      swimlaneId: doc.swimlaneId,
      oldSwimlaneId,
    });
  }
}

function cardState(userId, doc, fieldNames) {
  if (_.contains(fieldNames, 'archived')) {
    if (doc.archived) {
      Activities.insert({
        userId,
        activityType: 'archivedCard',
        listName: Lists.findOne(doc.listId).title,
        boardId: doc.boardId,
        listId: doc.listId,
        cardId: doc._id,
        swimlaneId: doc.swimlaneId,
      });
    } else {
      Activities.insert({
        userId,
        activityType: 'restoredCard',
        boardId: doc.boardId,
        listName: Lists.findOne(doc.listId).title,
        listId: doc.listId,
        cardId: doc._id,
        swimlaneId: doc.swimlaneId,
      });
    }
  }
}

function cardMembers(userId, doc, fieldNames, modifier) {
  if (!_.contains(fieldNames, 'members'))
    return;
  let memberId;
  // Say hello to the new member
  if (modifier.$addToSet && modifier.$addToSet.members) {
    memberId = modifier.$addToSet.members;
    const username = Users.findOne(memberId).username;
    if (!_.contains(doc.members, memberId)) {
      Activities.insert({
        userId,
        username,
        activityType: 'joinMember',
        boardId: doc.boardId,
        cardId: doc._id,
        memberId,
        listId: doc.listId,
        swimlaneId: doc.swimlaneId,
      });
    }
  }

  // Say goodbye to the former member
  if (modifier.$pull && modifier.$pull.members) {
    memberId = modifier.$pull.members;
    const users = Users.find(memberId);
    if (users.count() > 0) {
      const username = Users.findOne(memberId).username;
      // Check that the former member is member of the card
      if (_.contains(doc.members, memberId)) {
        Activities.insert({
          userId,
          username,
          activityType: 'unjoinMember',
          boardId: doc.boardId,
          cardId: doc._id,
          memberId,
          listId: doc.listId,
          swimlaneId: doc.swimlaneId,
        });
      }
    }
  }
}

function cardLabels(userId, doc, fieldNames, modifier) {
  if (!_.contains(fieldNames, 'labelIds'))
    return;
  let labelId;
  // Say hello to the new label
  if (modifier.$addToSet && modifier.$addToSet.labelIds) {
    labelId = modifier.$addToSet.labelIds;
    if (!_.contains(doc.labelIds, labelId)) {
      const act = {
        userId,
        labelId,
        activityType: 'addedLabel',
        boardId: doc.boardId,
        cardId: doc._id,
        listId: doc.listId,
        swimlaneId: doc.swimlaneId,
      };
      Activities.insert(act);
    }
  }

  // Say goodbye to the label
  if (modifier.$pull && modifier.$pull.labelIds) {
    labelId = modifier.$pull.labelIds;
    // Check that the former member is member of the card
    if (_.contains(doc.labelIds, labelId)) {
      Activities.insert({
        userId,
        labelId,
        activityType: 'removedLabel',
        boardId: doc.boardId,
        cardId: doc._id,
        listId: doc.listId,
        swimlaneId: doc.swimlaneId,
      });
    }
  }
}

function cardCustomFields(userId, doc, fieldNames, modifier) {
  if (!_.contains(fieldNames, 'customFields'))
    return;

  // Say hello to the new customField value
  if (modifier.$set) {
    _.each(modifier.$set, (value, key) => {
      if (key.startsWith('customFields')) {
        const dotNotation = key.split('.');

        // only individual changes are registered
        if (dotNotation.length > 1) {
          const customFieldId = doc.customFields[dotNotation[1]]._id;
          const act = {
            userId,
            customFieldId,
            value,
            activityType: 'setCustomField',
            boardId: doc.boardId,
            cardId: doc._id,
          };
          Activities.insert(act);
        }
      }
    });
  }

  // Say goodbye to the former customField value
  if (modifier.$unset) {
    _.each(modifier.$unset, (value, key) => {
      if (key.startsWith('customFields')) {
        const dotNotation = key.split('.');

        // only individual changes are registered
        if (dotNotation.length > 1) {
          const customFieldId = doc.customFields[dotNotation[1]]._id;
          const act = {
            userId,
            customFieldId,
            activityType: 'unsetCustomField',
            boardId: doc.boardId,
            cardId: doc._id,
          };
          Activities.insert(act);
        }
      }
    });
  }
}

function cardCreation(userId, doc) {
  var list = Lists.findOne(doc.listId);
  var swimlane = Swimlanes.findOne(doc.swimlaneId);
  if (list && list.title) {
    Activities.insert({
      userId,
      activityType: 'createCard',
      boardId: doc.boardId,
      listName: list.title,
      listId: doc.listId,
      cardId: doc._id,
      cardTitle:doc.title,
      swimlaneName: swimlane.title,
      swimlaneId: doc.swimlaneId,
    });
  } else {
    Activities.insert({
      userId,
      activityType: 'createCard',
      boardId: doc.boardId,
      listId: doc.listId,
      cardId: doc._id,
      cardTitle:doc.title,
      swimlaneId: doc.swimlaneId,
    });
  }
}

function cardRemover(userId, doc) {
  ChecklistItems.remove({
    cardId: doc._id,
  });
  Checklists.remove({
    cardId: doc._id,
  });
  Cards.remove({
    parentId: doc._id,
  });
  CardComments.remove({
    cardId: doc._id,
  });
  CardScores.remove({
    cardId: doc._id,
  });
  Attachments.remove({
    cardId: doc._id,
  });
}

if (Meteor.isServer) {
  // Cards are often fetched within a board, so we create an index to make these
  // queries more efficient.
  Meteor.startup(() => {
    Cards._collection._ensureIndex({boardId: 1, createdAt: -1});
    // https://github.com/wekan/wekan/issues/1863
    // Swimlane added a new field in the cards collection of mongodb named parentId.
    // When loading a board, mongodb is searching for every cards, the id of the parent (in the swinglanes collection).
    // With a huge database, this result in a very slow app and high CPU on the mongodb side.
    // To correct it, add Index to parentId:
    Cards._collection._ensureIndex({parentId: 1});
  });

  Cards.after.insert((userId, doc) => {
    cardCreation(userId, doc);
  });

  // New activity for card (un)archivage
  Cards.after.update((userId, doc, fieldNames) => {
    cardState(userId, doc, fieldNames);
  });

  //New activity for card moves
  Cards.after.update(function(userId, doc, fieldNames) {
    const oldListId = this.previous.listId;
    const oldSwimlaneId = this.previous.swimlaneId;
    const oldBoardId = this.previous.boardId;
    cardMove(userId, doc, fieldNames, oldListId, oldSwimlaneId, oldBoardId);
  });

  // Add a new activity if we add or remove a member to the card
  Cards.before.update((userId, doc, fieldNames, modifier) => {
    cardMembers(userId, doc, fieldNames, modifier);
    updateActivities(doc, fieldNames, modifier);
  });

  // Add a new activity if we add or remove a label to the card
  Cards.before.update((userId, doc, fieldNames, modifier) => {
    cardLabels(userId, doc, fieldNames, modifier);
  });

  // Add a new activity if we edit a custom field
  Cards.before.update((userId, doc, fieldNames, modifier) => {
    cardCustomFields(userId, doc, fieldNames, modifier);
  });

  // Remove all activities associated with a card if we remove the card
  // Remove also card_comments / checklists / attachments
  Cards.before.remove((userId, doc) => {
    cardRemover(userId, doc);
  });
}
//SWIMLANES REST API
if (Meteor.isServer) {
  /**
   * @operation get_swimlane_cards
   * @summary get all cards attached to a swimlane
   *
   * @param {string} boardId the board ID
   * @param {string} swimlaneId the swimlane ID
   * @return_type [{_id: string,
   *                title: string,
   *                description: string,
   *                listId: string}]
   */
  JsonRoutes.add('GET', '/api/boards/:boardId/swimlanes/:swimlaneId/cards', function(req, res) {
    const paramBoardId = req.params.boardId;
    const paramSwimlaneId = req.params.swimlaneId;
    Authentication.checkBoardAccess(req.userId, paramBoardId);
    JsonRoutes.sendResult(res, {
      code: 200,
      data: Cards.find({
        boardId: paramBoardId,
        swimlaneId: paramSwimlaneId,
        archived: false,
      }).map(function(doc) {
        return {
          _id: doc._id,
          title: doc.title,
          description: doc.description,
          listId: doc.listId,
        };
      }),
    });
  });
}
//LISTS REST API
if (Meteor.isServer) {
  /**
   * @operation get_all_cards
   * @summary Get all Cards attached to a List
   *
   * @param {string} boardId the board ID
   * @param {string} listId the list ID
   * @return_type [{_id: string,
   *                title: string,
   *                description: string}]
   */
  JsonRoutes.add('GET', '/api/boards/:boardId/lists/:listId/cards', function(req, res) {
    const paramBoardId = req.params.boardId;
    const paramListId = req.params.listId;
    Authentication.checkBoardAccess(req.userId, paramBoardId);
    JsonRoutes.sendResult(res, {
      code: 200,
      data: Cards.find({
        boardId: paramBoardId,
        listId: paramListId,
        archived: false,
      }).map(function(doc) {
        return {
          _id: doc._id,
          title: doc.title,
          description: doc.description,
        };
      }),
    });
  });

  /**
   * @operation get_card
   * @summary Get a Card
   *
   * @param {string} boardId the board ID
   * @param {string} listId the list ID of the card
   * @param {string} cardId the card ID
   * @return_type Cards
   */
  JsonRoutes.add('GET', '/api/boards/:boardId/lists/:listId/cards/:cardId', function(req, res) {
    const paramBoardId = req.params.boardId;
    const paramListId = req.params.listId;
    const paramCardId = req.params.cardId;
    Authentication.checkBoardAccess(req.userId, paramBoardId);
    JsonRoutes.sendResult(res, {
      code: 200,
      data: Cards.findOne({
        _id: paramCardId,
        listId: paramListId,
        boardId: paramBoardId,
        archived: false,
      }),
    });
  });

  /**
   * @operation new_card
   * @summary Create a new Card
   *
   * @param {string} boardId the board ID of the new card
   * @param {string} listId the list ID of the new card
   * @param {string} authorID the user ID of the person owning the card
   * @param {string} parentId the parent ID of the new card
   * @param {string} title the title of the new card
   * @param {string} description the description of the new card
   * @param {string} swimlaneId the swimlane ID of the new card
   * @param {string} [members] the member IDs list of the new card
   * @return_type {_id: string}
   */
  JsonRoutes.add('POST', '/api/boards/:boardId/lists/:listId/cards', function(req, res) {
    Authentication.checkUserId(req.userId);
    const paramBoardId = req.params.boardId;
    const paramListId = req.params.listId;
    const paramParentId = req.params.parentId;
    const currentCards = Cards.find({
      listId: paramListId,
      archived: false,
    }, { sort: ['sort'] });
    const check = Users.findOne({
      _id: req.body.authorId,
    });
    const members = req.body.members || [req.body.authorId];
    if (typeof check !== 'undefined') {
      const id = Cards.direct.insert({
        title: req.body.title,
        boardId: paramBoardId,
        listId: paramListId,
        parentId: paramParentId,
        description: req.body.description,
        userId: req.body.authorId,
        swimlaneId: req.body.swimlaneId,
        sort: currentCards.count(),
        members,
      });
      JsonRoutes.sendResult(res, {
        code: 200,
        data: {
          _id: id,
        },
      });

      const card = Cards.findOne({
        _id: id,
      });
      cardCreation(req.body.authorId, card);

    } else {
      JsonRoutes.sendResult(res, {
        code: 401,
      });
    }
  });

  /*
   * Note for the JSDoc:
   * 'list' will be interpreted as the path parameter
   * 'listID' will be interpreted as the body parameter
   */
  /**
   * @operation edit_card
   * @summary Edit Fields in a Card
   *
   * @description Edit a card
   *
   * The color has to be chosen between `white`, `green`, `yellow`, `orange`,
   * `red`, `purple`, `blue`, `sky`, `lime`, `pink`, `black`, `silver`,
   * `peachpuff`, `crimson`, `plum`, `darkgreen`, `slateblue`, `magenta`,
   * `gold`, `navy`, `gray`, `saddlebrown`, `paleturquoise`, `mistyrose`,
   * `indigo`:
   *
   * <img src="/card-colors.png" width="40%" alt="Wekan card colors" />
   *
   * Note: setting the color to white has the same effect than removing it.
   *
   * @param {string} boardId the board ID of the card
   * @param {string} list the list ID of the card
   * @param {string} cardId the ID of the card
   * @param {string} [title] the new title of the card
   * @param {string} [listId] the new list ID of the card (move operation)
   * @param {string} [description] the new description of the card
   * @param {string} [authorId] change the owner of the card
   * @param {string} [parentId] change the parent of the card
   * @param {string} [labelIds] the new list of label IDs attached to the card
   * @param {string} [swimlaneId] the new swimlane ID of the card
   * @param {string} [members] the new list of member IDs attached to the card
   * @param {string} [requestedBy] the new requestedBy field of the card
   * @param {string} [assignedBy] the new assignedBy field of the card
   * @param {string} [receivedAt] the new receivedAt field of the card
   * @param {string} [assignBy] the new assignBy field of the card
   * @param {string} [startAt] the new startAt field of the card
   * @param {string} [dueAt] the new dueAt field of the card
   * @param {string} [endAt] the new endAt field of the card
   * @param {string} [spentTime] the new spentTime field of the card
   * @param {boolean} [isOverTime] the new isOverTime field of the card
   * @param {string} [customFields] the new customFields value of the card
   * @param {string} [color] the new color of the card
   * @return_type {_id: string}
   */
  JsonRoutes.add('PUT', '/api/boards/:boardId/lists/:listId/cards/:cardId', function(req, res) {
    Authentication.checkUserId(req.userId);
    const paramBoardId = req.params.boardId;
    const paramCardId = req.params.cardId;
    const paramListId = req.params.listId;

    if (req.body.hasOwnProperty('title')) {
      const newTitle = req.body.title;
      Cards.direct.update({
        _id: paramCardId,
        listId: paramListId,
        boardId: paramBoardId,
        archived: false,
      }, {
        $set: {
          title: newTitle,
        },
      });
    }
    if (req.body.hasOwnProperty('listId')) {
      const newParamListId = req.body.listId;
      Cards.direct.update({
        _id: paramCardId,
        listId: paramListId,
        boardId: paramBoardId,
        archived: false,
      }, {
        $set: {
          listId: newParamListId,
        },
      });

      const card = Cards.findOne({
        _id: paramCardId,
      });
      cardMove(req.body.authorId, card, {
        fieldName: 'listId',
      }, paramListId);

    }
    if (req.body.hasOwnProperty('parentId')) {
      const newParentId = req.body.parentId;
      Cards.direct.update({
        _id: paramCardId,
        listId: paramListId,
        boardId: paramBoardId,
        archived: false,
      }, {
        $set: {
          parentId: newParentId,
        },
      });
    }
    if (req.body.hasOwnProperty('description')) {
      const newDescription = req.body.description;
      Cards.direct.update({
        _id: paramCardId,
        listId: paramListId,
        boardId: paramBoardId,
        archived: false,
      }, {
        $set: {
          description: newDescription,
        },
      });
    }
    if (req.body.hasOwnProperty('color')) {
      const newColor = req.body.color;
      Cards.direct.update({_id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false},
        {$set: {color: newColor}});
    }
    if (req.body.hasOwnProperty('labelIds')) {
      let newlabelIds = req.body.labelIds;
      if (_.isString(newlabelIds)) {
        if (newlabelIds === '') {
          newlabelIds = null;
        }
        else {
          newlabelIds = [newlabelIds];
        }
      }
      Cards.direct.update({
        _id: paramCardId,
        listId: paramListId,
        boardId: paramBoardId,
        archived: false,
      }, {
        $set: {
          labelIds: newlabelIds,
        },
      });
    }
    if (req.body.hasOwnProperty('requestedBy')) {
      const newrequestedBy = req.body.requestedBy;
      Cards.direct.update({_id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false},
        {$set: {requestedBy: newrequestedBy}});
    }
    if (req.body.hasOwnProperty('assignedBy')) {
      const newassignedBy = req.body.assignedBy;
      Cards.direct.update({_id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false},
        {$set: {assignedBy: newassignedBy}});
    }
    if (req.body.hasOwnProperty('receivedAt')) {
      const newreceivedAt = req.body.receivedAt;
      Cards.direct.update({_id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false},
        {$set: {receivedAt: newreceivedAt}});
    }
    if (req.body.hasOwnProperty('startAt')) {
      const newstartAt = req.body.startAt;
      Cards.direct.update({_id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false},
        {$set: {startAt: newstartAt}});
    }
    if (req.body.hasOwnProperty('dueAt')) {
      const newdueAt = req.body.dueAt;
      Cards.direct.update({_id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false},
        {$set: {dueAt: newdueAt}});
    }
    if (req.body.hasOwnProperty('endAt')) {
      const newendAt = req.body.endAt;
      Cards.direct.update({_id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false},
        {$set: {endAt: newendAt}});
    }
    if (req.body.hasOwnProperty('spentTime')) {
      const newspentTime = req.body.spentTime;
      Cards.direct.update({_id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false},
        {$set: {spentTime: newspentTime}});
    }
    if (req.body.hasOwnProperty('isOverTime')) {
      const newisOverTime = req.body.isOverTime;
      Cards.direct.update({_id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false},
        {$set: {isOverTime: newisOverTime}});
    }
    if (req.body.hasOwnProperty('customFields')) {
      const newcustomFields = req.body.customFields;
      Cards.direct.update({_id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false},
        {$set: {customFields: newcustomFields}});
    }
    if (req.body.hasOwnProperty('members')) {
      let newmembers = req.body.members;
      if (_.isString(newmembers)) {
        if (newmembers === '') {
          newmembers = null;
        }
        else {
          newmembers = [newmembers];
        }
      }
      Cards.direct.update({_id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false},
        {$set: {members: newmembers}});
    }
    if (req.body.hasOwnProperty('swimlaneId')) {
      const newParamSwimlaneId = req.body.swimlaneId;
      Cards.direct.update({_id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false},
        {$set: {swimlaneId: newParamSwimlaneId}});
    }
    JsonRoutes.sendResult(res, {
      code: 200,
      data: {
        _id: paramCardId,
      },
    });
  });

  /**
   * @operation delete_card
   * @summary Delete a card from a board
   *
   * @description This operation **deletes** a card, and therefore the card
   * is not put in the recycle bin.
   *
   * @param {string} boardId the board ID of the card
   * @param {string} list the list ID of the card
   * @param {string} cardId the ID of the card
   * @return_type {_id: string}
   */
  JsonRoutes.add('DELETE', '/api/boards/:boardId/lists/:listId/cards/:cardId', function(req, res) {
    Authentication.checkUserId(req.userId);
    const paramBoardId = req.params.boardId;
    const paramListId = req.params.listId;
    const paramCardId = req.params.cardId;

    Cards.direct.remove({
      _id: paramCardId,
      listId: paramListId,
      boardId: paramBoardId,
    });
    const card = Cards.find({
      _id: paramCardId,
    });
    cardRemover(req.body.authorId, card);
    JsonRoutes.sendResult(res, {
      code: 200,
      data: {
        _id: paramCardId,
      },
    });

  });
}
