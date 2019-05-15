Cards = new Mongo.Collection('cards');

// XXX To improve pub/sub performances a card document should include a
// de-normalized number of comments so we don't have to publish the whole list
// of comments just to display the number of them in the board view.
Cards.attachSchema(new SimpleSchema({
  title: {
    type: String,
    optional: true,
    defaultValue: '',
  },
  archived: {
    type: Boolean,
    autoValue() { // eslint-disable-line consistent-return
      if (this.isInsert && !this.isSet) {
        return false;
      }
    },
  },
  parentId: {
    type: String,
    optional: true,
    defaultValue: '',
  },
  listId: {
    type: String,
    optional: true,
    defaultValue: '',
  },
  swimlaneId: {
    type: String,
  },
  // The system could work without this `boardId` information (we could deduce
  // the board identifier from the card), but it would make the system more
  // difficult to manage and less efficient.
  boardId: {
    type: String,
    optional: true,
    defaultValue: '',
  },
  coverId: {
    type: String,
    optional: true,
    defaultValue: '',

  },
  createdAt: {
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
    type: [Object],
    optional: true,
    defaultValue: [],
  },
  'customFields.$': {
    type: new SimpleSchema({
      _id: {
        type: String,
        optional: true,
        defaultValue: '',
      },
      value: {
        type: Match.OneOf(String, Number, Boolean, Date),
        optional: true,
        defaultValue: '',
      },
    }),
  },
  dateLastActivity: {
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
    type: String,
    optional: true,
    defaultValue: '',
  },
  requestedBy: {
    type: String,
    optional: true,
    defaultValue: '',
  },
  assignedBy: {
    type: String,
    optional: true,
    defaultValue: '',
  },
  labelIds: {
    type: [String],
    optional: true,
    defaultValue: [],
  },
  members: {
    type: [String],
    optional: true,
    defaultValue: [],
  },
  receivedAt: {
    type: Date,
    optional: true,
  },
  startAt: {
    type: Date,
    optional: true,
  },
  dueAt: {
    type: Date,
    optional: true,
  },
  endAt: {
    type: Date,
    optional: true,
  },
  spentTime: {
    type: Number,
    decimal: true,
    optional: true,
    defaultValue: 0,
  },
  isOvertime: {
    type: Boolean,
    defaultValue: false,
    optional: true,
  },
  // XXX Should probably be called `authorId`. Is it even needed since we have
  // the `members` field?
  userId: {
    type: String,
    autoValue() { // eslint-disable-line consistent-return
      if (this.isInsert && !this.isSet) {
        return this.userId;
      }
    },
  },
  sort: {
    type: Number,
    decimal: true,
    defaultValue: '',
  },
  subtaskSort: {
    type: Number,
    decimal: true,
    defaultValue: -1,
    optional: true,
  },
  type: {
    type: String,
    defaultValue: '',
  },
  linkedId: {
    type: String,
    optional: true,
    defaultValue: '',
  },
}));

Cards.allow({
  insert(userId, doc) {
    return allowIsBoardMember(userId, Boards.findOne(doc.boardId));
  },
  update(userId, doc) {
    return allowIsBoardMember(userId, Boards.findOne(doc.boardId));
  },
  remove(userId, doc) {
    return allowIsBoardMember(userId, Boards.findOne(doc.boardId));
  },
  fetch: ['boardId'],
});

Cards.helpers({
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
    }, {sort: { sort: 1 } });
  },

  allSubtasks() {
    return Cards.find({
      parentId: this._id,
      archived: false,
    }, {sort: { sort: 1 } });
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
      archived: true}).count();
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
      boardId: this.boardId,
    }).fetch();

    // match right definition to each field
    if (!this.customFields) {
      return [];
    } else {
      return this.customFields.map((customField) => {
        const definition = definitions.find((definition) => {
          return definition._id === customField._id;
        });
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
    }

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
    const list = Lists.findOne({_id: this.listId});
    if(!list.getWipLimit('soft') && list.getWipLimit('enabled') && list.getWipLimit('value') === list.cards().count()){
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
    return this.parentList().map(function(elem){
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

  getMembers() {
    if (this.isLinkedCard()) {
      const card = Cards.findOne({_id: this.linkedId});
      return card.members;
    } else if (this.isLinkedBoard()) {
      const board = Boards.findOne({_id: this.linkedId});
      return board.activeMembers().map((member) => {
        return member.userId;
      });
    } else {
      return this.members;
    }
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

  toggleMember(memberId) {
    if (this.getMembers() && this.getMembers().indexOf(memberId) > -1) {
      return this.unassignMember(memberId);
    } else {
      return this.assignMember(memberId);
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
    cardScores.forEach((cardScore) => {
      labels.push(cardScore.date);
      var score = cardScore.score;
      if (typeof score === 'number') {
        score = score.toString();
      }
      scores[cardScore.type].push({x: cardScore.date, y: score.replace('%', '').trim(), scoreType: cardScore.type})
    });
    if (cardScores.count() > 0 && scoreChart !== null) {
      scoreChart.data.labels = labels;
      scoreChart.data.datasets[0].data = scores.current;
      scoreChart.data.datasets[1].data = scores.target;
      scoreChart.update();
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
    Cards.find({ parentId: this._id }).forEach((card) => {
      funct(card);
    });
  },

  archive() {
    this.applyToChildren((card) => { return card.archive(); });
    return {$set: {archived: true}};
  },

  restore() {
    this.applyToChildren((card) => { return card.restore(); });
    return {$set: {archived: false}};
  },

  move(swimlaneId, listId, sortIndex) {
    const list = Lists.findOne(listId);
    const mutatedFields = {
      swimlaneId,
      listId,
      boardId: list.boardId,
      sort: sortIndex,
    };

    return {$set: mutatedFields};
  },

  addLabel(labelId) {
    return {$addToSet: {labelIds: labelId}};
  },

  removeLabel(labelId) {
    return {$pull: {labelIds: labelId}};
  },

  toggleLabel(labelId) {
    if (this.labelIds && this.labelIds.indexOf(labelId) > -1) {
      return this.removeLabel(labelId);
    } else {
      return this.addLabel(labelId);
    }
  },

  assignCustomField(customFieldId) {
    return {$addToSet: {customFields: {_id: customFieldId, value: null}}};
  },

  unassignCustomField(customFieldId) {
    return {$pull: {customFields: {_id: customFieldId}}};
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
      const update = {$set: {}};
      update.$set[`customFields.${index}.value`] = value;
      return update;
    }
    // TODO
    // Ignatz 18.05.2018: Return null to silence ESLint. No Idea if that is correct
    return null;
  },

  setCover(coverId) {
    return {$set: {coverId}};
  },

  unsetCover() {
    return {$unset: {coverId: ''}};
  },

  setParentId(parentId) {
    return {$set: {parentId}};
  },
});


//FUNCTIONS FOR creation of Activities

function cardMove(userId, doc, fieldNames, oldListId, oldSwimlaneId) {
  if ((_.contains(fieldNames, 'listId') && doc.listId !== oldListId) ||
      (_.contains(fieldNames, 'swimlaneId') && doc.swimlaneId !== oldSwimlaneId)){
    Activities.insert({
      userId,
      oldListId,
      activityType: 'moveCard',
      listId: doc.listId,
      boardId: doc.boardId,
      cardId: doc._id,
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
        boardId: doc.boardId,
        listId: doc.listId,
        cardId: doc._id,
      });
    } else {
      Activities.insert({
        userId,
        activityType: 'restoredCard',
        boardId: doc.boardId,
        listId: doc.listId,
        cardId: doc._id,
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
    if (!_.contains(doc.members, memberId)) {
      Activities.insert({
        userId,
        memberId,
        activityType: 'joinMember',
        boardId: doc.boardId,
        cardId: doc._id,
      });
    }
  }

  // Say goodbye to the former member
  if (modifier.$pull && modifier.$pull.members) {
    memberId = modifier.$pull.members;
    // Check that the former member is member of the card
    if (_.contains(doc.members, memberId)) {
      Activities.insert({
        userId,
        memberId,
        activityType: 'unjoinMember',
        boardId: doc.boardId,
        cardId: doc._id,
      });
    }
  }
}

function cardCreation(userId, doc) {
  Activities.insert({
    userId,
    activityType: 'createCard',
    boardId: doc.boardId,
    listId: doc.listId,
    cardId: doc._id,
    swimlaneId: doc.swimlaneId,
  });
}

function cardRemover(userId, doc) {
  Activities.remove({
    cardId: doc._id,
  });  
  Checklists.remove({
    cardId: doc._id,
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
  Cards.after.update(function (userId, doc, fieldNames) {
    const oldListId = this.previous.listId;
    const oldSwimlaneId = this.previous.swimlaneId;
    cardMove(userId, doc, fieldNames, oldListId, oldSwimlaneId);
  });

  // Add a new activity if we add or remove a member to the card
  Cards.before.update((userId, doc, fieldNames, modifier) => {
    cardMembers(userId, doc, fieldNames, modifier);
  });

  // Remove all activities associated with a card if we remove the card
  // Remove also card_comments / checklists / attachments
  Cards.after.remove((userId, doc) => {
    cardRemover(userId, doc);
  });
}
//SWIMLANES REST API
if (Meteor.isServer) {
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
  JsonRoutes.add('GET', '/api/boards/:boardId/lists/:listId/cards', function (req, res) {
    const paramBoardId = req.params.boardId;
    const paramListId = req.params.listId;
    Authentication.checkBoardAccess(req.userId, paramBoardId);
    JsonRoutes.sendResult(res, {
      code: 200,
      data: Cards.find({boardId: paramBoardId, listId: paramListId, archived: false}).map(function (doc) {
        return {
          _id: doc._id,
          title: doc.title,
          description: doc.description,
        };
      }),
    });
  });

  JsonRoutes.add('GET', '/api/boards/:boardId/lists/:listId/cards/:cardId', function (req, res) {
    const paramBoardId = req.params.boardId;
    const paramListId = req.params.listId;
    const paramCardId = req.params.cardId;
    Authentication.checkBoardAccess(req.userId, paramBoardId);
    JsonRoutes.sendResult(res, {
      code: 200,
      data: Cards.findOne({_id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false}),
    });
  });

  JsonRoutes.add('POST', '/api/boards/:boardId/lists/:listId/cards', function (req, res) {
    Authentication.checkUserId(req.userId);
    const paramBoardId = req.params.boardId;
    const paramListId = req.params.listId;
    const check = Users.findOne({_id: req.body.authorId});
    const members = req.body.members || [req.body.authorId];
    if (typeof  check !== 'undefined') {
      const id = Cards.direct.insert({
        title: req.body.title,
        boardId: paramBoardId,
        listId: paramListId,
        description: req.body.description,
        userId: req.body.authorId,
        swimlaneId: req.body.swimlaneId,
        sort: 0,
        members,
      });
      JsonRoutes.sendResult(res, {
        code: 200,
        data: {
          _id: id,
        },
      });

      const card = Cards.findOne({_id:id});
      cardCreation(req.body.authorId, card);

    } else {
      JsonRoutes.sendResult(res, {
        code: 401,
      });
    }
  });

  JsonRoutes.add('PUT', '/api/boards/:boardId/lists/:listId/cards/:cardId', function (req, res) {
    Authentication.checkUserId(req.userId);
    const paramBoardId = req.params.boardId;
    const paramCardId = req.params.cardId;
    const paramListId = req.params.listId;

    if (req.body.hasOwnProperty('title')) {
      const newTitle = req.body.title;
      Cards.direct.update({_id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false},
        {$set: {title: newTitle}});
    }
    if (req.body.hasOwnProperty('listId')) {
      const newParamListId = req.body.listId;
      Cards.direct.update({_id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false},
        {$set: {listId: newParamListId}});

      const card = Cards.findOne({_id: paramCardId} );
      cardMove(req.body.authorId, card, {fieldName: 'listId'}, paramListId);

    }
    if (req.body.hasOwnProperty('description')) {
      const newDescription = req.body.description;
      Cards.direct.update({_id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false},
        {$set: {description: newDescription}});
    }
    if (req.body.hasOwnProperty('labelIds')) {
      const newlabelIds = req.body.labelIds;
      Cards.direct.update({_id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false},
        {$set: {labelIds: newlabelIds}});
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
    JsonRoutes.sendResult(res, {
      code: 200,
      data: {
        _id: paramCardId,
      },
    });
  });


  JsonRoutes.add('DELETE', '/api/boards/:boardId/lists/:listId/cards/:cardId', function (req, res) {
    Authentication.checkUserId(req.userId);
    const paramBoardId = req.params.boardId;
    const paramListId = req.params.listId;
    const paramCardId = req.params.cardId;

    Cards.direct.remove({_id: paramCardId, listId: paramListId, boardId: paramBoardId});
    const card = Cards.find({_id: paramCardId} );
    cardRemover(req.body.authorId, card);
    JsonRoutes.sendResult(res, {
      code: 200,
      data: {
        _id: paramCardId,
      },
    });

  });
}
