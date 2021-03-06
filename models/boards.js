Boards = new Mongo.Collection('boards');

/**
 * This is a Board.
 */
Boards.attachSchema(new SimpleSchema({
  title: {
    /**
     * The title of the board
     */
    type: String,
  },
  slug: {
    /**
     * The title slugified.
     */
    type: String,
    autoValue() { // eslint-disable-line consistent-return
      // XXX We need to improve slug management. Only the id should be necessary
      // to identify a board in the code.
      // XXX If the board title is updated, the slug should also be updated.
      // In some cases (Chinese and Japanese for instance) the `getSlug` function
      // return an empty string. This is causes bugs in our application so we set
      // a default slug in this case.
      if (this.isInsert && !this.isSet) {
        let slug = 'board';
        const title = this.field('title');
        if (title.isSet) {
          slug = getSlug(title.value) || slug;
        }
        return slug;
      }
    },
  },
  archived: {
    /**
     * Is the board archived?
     */
    type: Boolean,
    autoValue() { // eslint-disable-line consistent-return
      if (this.isInsert && !this.isSet) {
        return false;
      }
    },
  },
  createdAt: {
    /**
     * Creation time of the board
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
  // XXX Inconsistent field naming
  modifiedAt: {
    /**
     * Last modification time of the board
     */
    type: Date,
    optional: true,
    autoValue() { // eslint-disable-line consistent-return
      if (this.isUpdate) {
        return new Date();
      } else {
        this.unset();
      }
    },
  },
  // De-normalized number of users that have starred this board
  stars: {
    /**
     * How many stars the board has
     */
    type: Number,
    autoValue() { // eslint-disable-line consistent-return
      if (this.isInsert) {
        return 0;
      }
    },
  },
  // De-normalized label system
  'labels': {
    /**
     * List of labels attached to a board
     */
    type: [Object],
    autoValue() { // eslint-disable-line consistent-return
      if (this.isInsert && !this.isSet) {
        const colors = Boards.simpleSchema()._schema['labels.$.color'].allowedValues;
        const defaultLabelsColors = _.clone(colors).splice(0, 6);
        return defaultLabelsColors.map((color) => ({
          color,
          _id: Random.id(6),
          name: '',
        }));
      }
    },
  },
  'labels.$._id': {
    /**
     * Unique id of a label
     */
    // We don't specify that this field must be unique in the board because that
    // will cause performance penalties and is not necessary since this field is
    // always set on the server.
    // XXX Actually if we create a new label, the `_id` is set on the client
    // without being overwritten by the server, could it be a problem?
    type: String,
  },
  'labels.$.name': {
    /**
     * Name of a label
     */
    type: String,
    optional: true,
  },
  'labels.$.color': {
    /**
     * color of a label.
     *
     * Can be amongst `green`, `yellow`, `orange`, `red`, `purple`,
     * `blue`, `sky`, `lime`, `pink`, `black`,
     * `silver`, `peachpuff`, `crimson`, `plum`, `darkgreen`,
     * `slateblue`, `magenta`, `gold`, `navy`, `gray`,
     * `saddlebrown`, `paleturquoise`, `mistyrose`, `indigo`
     */
    type: String,
    allowedValues: [
      'green', 'yellow', 'orange', 'red', 'purple',
      'blue', 'sky', 'lime', 'pink', 'black',
      'silver', 'peachpuff', 'crimson', 'plum', 'darkgreen',
      'slateblue', 'magenta', 'gold', 'navy', 'gray',
      'saddlebrown', 'paleturquoise', 'mistyrose', 'indigo',
    ],
  },
  // XXX We might want to maintain more informations under the member sub-
  // documents like de-normalized meta-data (the date the member joined the
  // board, the number of contributions, etc.).
  'members': {
    /**
     * List of members of a board
     */
    type: [Object],
    autoValue() { // eslint-disable-line consistent-return
      if (this.isInsert && !this.isSet) {
        return [{
          userId: this.userId,
          isAdmin: true,
          isActive: true,
          isNoComments: false,
          isCommentOnly: false,
        }];
      }
    },
  },
  'members.$.userId': {
    /**
     * The uniq ID of the member
     */
    type: String,
  },
  'members.$.isAdmin': {
    /**
     * Is the member an admin of the board?
     */
    type: Boolean,
  },
  'members.$.isActive': {
    /**
     * Is the member active?
     */
    type: Boolean,
  },
  'members.$.isNoComments': {
    /**
     * Is the member not allowed to make comments
     */
    type: Boolean,
    optional: true,
  },
  'members.$.isCommentOnly': {
    /**
     * Is the member only allowed to comment on the board
     */
    type: Boolean,
    optional: true,
  },
  permission: {
    /**
     * visibility of the board
     */
    type: String,
    allowedValues: ['public', 'private'],
  },
  color: {
    /**
     * The color of the board.
     */
    type: String,
    allowedValues: [
    	'belize',
      'nephritis',
      'pomegranate',
      'pumpkin',
      'wisteria',
      'moderatepink',
      'strongcyan',
      'limegreen',
      'midnight',
      'dark',
      'relax',
      'corteza',
      'clearblue',
      'natural',
      'modern',
      'moderndark'
    ],
    autoValue() { // eslint-disable-line consistent-return
      if (this.isInsert && !this.isSet) {
        return Boards.simpleSchema()._schema.color.allowedValues[0];
      }
    },
  },
  description: {
    /**
     * The description of the board
     */
    type: String,
    optional: true,
    defaultValue: null,
  },
  subtasksDefaultBoardId: {
    /**
     * The default board ID assigned to subtasks.
     */
    type: String,
    optional: true,
    defaultValue: null,
  },
  subtasksDefaultListId: {
    /**
     * The default List ID assigned to subtasks.
     */
    type: String,
    optional: true,
    defaultValue: null,
  },
  allowsSubtasks: {
    /**
     * Does the board allows subtasks?
     */
    type: Boolean,
    defaultValue: true,
  },
  presentParentTask: {
    /**
     * Controls how to present the parent task:
     *
     * - `prefix-with-full-path`: add a prefix with the full path
     * - `prefix-with-parent`: add a prefisx with the parent name
     * - `subtext-with-full-path`: add a subtext with the full path
     * - `subtext-with-parent`: add a subtext with the parent name
     * - `no-parent`: does not show the parent at all
     */
    type: String,
    allowedValues: [
      'prefix-with-full-path',
      'prefix-with-parent',
      'subtext-with-full-path',
      'subtext-with-parent',
      'no-parent',
    ],
    optional: true,
    defaultValue: 'no-parent',
  },
  startAt: {
    /**
     * Starting date of the board.
     */
    type: Date,
    optional: true,
  },
  dueAt: {
    /**
     * Due date of the board.
     */
    type: Date,
    optional: true,
  },
  endAt: {
    /**
     * End date of the board.
     */
    type: Date,
    optional: true,
  },
  spentTime: {
    /**
     * Time spent in the board.
     */
    type: Number,
    decimal: true,
    optional: true,
  },
  isOvertime: {
    /**
     * Is the board overtimed?
     */
    type: Boolean,
    defaultValue: false,
    optional: true,
  },
  type: {
    /**
     * The type of board
     */
    type: String,
    defaultValue: 'board',
  },
  quotaGroupId: {
	  type: String,
	  optional: true,
  },
	createdBy: {
	  type: String,
	  optional: true,
    autoValue() {
      if (this.isInsert) {
        return Meteor.user()._id;
      } else {
        this.unset();
      }
    },
	},
}));


Boards.helpers({
	getNewBoardId() {
    delete this._id;
    return Boards.insert(this);
	},

  copy(_id, oldId) {
    // Copy all swimlanes in board
    Swimlanes.find({
      boardId: oldId,
      archived: false,
    }).forEach((swimlane) => {
      swimlane.type = 'swimlane';
      swimlane.copy(_id);
    });
  },

  searchBoard() {
    $('a.folderOpener, a#templatesFolder, a#uncategorisedBoardsFolder').removeClass('selected');
    $('li.js-add-board, li.js-add-board-template, li.uncategorised_boards, li.categorised_boards, li.board_templates').hide();
    $('.emptyFolderMessage').remove();
    $('li.searched_boards').show();
    $('.searchedBoardsResultsHeader').remove();
    $('.board-list.clearfix.ui-sortable').prepend(
      '<h1 class="searchedBoardsResultsHeader" style="margin-left: 8px;">' +
      TAPi18n.__('search-results-for')  + ' " ' + Session.get('searchingBoardTitle') +
      ' "</h1>'
    );
  },

  /**
   * Is supplied user authorized to view this board?
   */
  isVisibleBy(user) {
    if (this.isPublic()) {
      // public boards are visible to everyone
      return true;
    } else {
      // otherwise you have to be logged-in and active member
      return user && this.isActiveMember(user._id);
    }
  },

  /**
   * Is the user one of the active members of the board?
   *
   * @param userId
   * @returns {boolean} the member that matches, or undefined/false
   */
  isActiveMember(userId) {
    if (userId) {
      return this.members.find((member) => (member.userId === userId && member.isActive));
    } else {
      return false;
    }
  },

  isPublic() {
    return this.permission === 'public';
  },

  cards() {
    return Cards.find({ boardId: this._id, archived: false }, { sort: { title: 1 } });
  },

  lists() {
    return Lists.find({ boardId: this._id, archived: false }, { sort: { sort: 1 } });
  },

  nullSortLists() {
    return Lists.find({
      boardId: this._id,
      archived: false,
      sort: { $eq: null },
    });
  },

  swimlanes() {
    return Swimlanes.find({ boardId: this._id, archived: false }, { sort: { sort: 1 } });
  },

  nextSwimlane(swimlane) {
    return Swimlanes.findOne({
      boardId: this._id,
      archived: false,
      sort: { $gte: swimlane.sort },
      _id: { $ne: swimlane._id },
    }, {
      sort: { sort: 1 },
    });
  },

  nullSortSwimlanes() {
    return Swimlanes.find({
      boardId: this._id,
      archived: false,
      sort: { $eq: null },
    });
  },

  hasOvertimeCards(){
    const card = Cards.findOne({isOvertime: true, boardId: this._id, archived: false} );
    return card !== undefined;
  },

  hasSpentTimeCards(){
    const card = Cards.findOne({spentTime: { $gt: 0 }, boardId: this._id, archived: false} );
    return card !== undefined;
  },

  activities() {
    return Activities.find({ boardId: this._id }, { sort: { createdAt: -1 } });
  },

  activeMembers() {
    return _.where(this.members, { isActive: true });
  },

  activeAdmins() {
    return _.where(this.members, { isActive: true, isAdmin: true });
  },

  memberUsers() {
    return Users.find({ _id: { $in: _.pluck(this.members, 'userId') } });
  },

  getLabel(name, color) {
    return _.findWhere(this.labels, { name, color });
  },

  getLabelById(labelId){
    return _.findWhere(this.labels, { _id: labelId });
  },

  labelIndex(labelId) {
    return _.pluck(this.labels, '_id').indexOf(labelId);
  },

  memberIndex(memberId) {
    return _.pluck(this.members, 'userId').indexOf(memberId);
  },

  hasMember(memberId) {
    return !!_.findWhere(this.members, { userId: memberId, isActive: true });
  },

  hasAdmin(memberId) {
    return !!_.findWhere(this.members, { userId: memberId, isActive: true, isAdmin: true });
  },

  hasNoComments(memberId) {
    return !!_.findWhere(this.members, { userId: memberId, isActive: true, isAdmin: false, isNoComments: true });
  },

  hasCommentOnly(memberId) {
    return !!_.findWhere(this.members, { userId: memberId, isActive: true, isAdmin: false, isCommentOnly: true });
  },

  boardAdmin() {
	  return _.findWhere(this.members, {isAdmin: true});
  },
  absoluteUrl() {
    return FlowRouter.url('board', { id: this._id, slug: this.slug });
  },

  colorClass() {
    return `board-color-${this.color}`;
  },

  customFields() {
    return CustomFields.find({ boardIds: {$in: [this._id]} }, { sort: { name: 1 } });
  },

  // XXX currently mutations return no value so we have an issue when using addLabel in import
  // XXX waiting on https://github.com/mquandalle/meteor-collection-mutations/issues/1 to remove...
  pushLabel(name, color) {
    const _id = Random.id(6);
    Boards.direct.update(this._id, { $push: { labels: { _id, name, color } } });
    return _id;
  },

  searchSwimlanes(term) {
    check(term, Match.OneOf(String, null, undefined));

    const query = { boardId: this._id };
    if (this.isTemplatesBoard()) {
      query.type = 'template-swimlane';
      query.archived = false;
    } else {
      query.type = {$nin: ['template-swimlane']};
    }
    const projection = { limit: 10, sort: { createdAt: -1 } };

    if (term) {
      const regex = new RegExp(term, 'i');

      query.$or = [
        { title: regex },
        { description: regex },
      ];
    }

    return Swimlanes.find(query, projection);
  },

  searchLists(term) {
    check(term, Match.OneOf(String, null, undefined));

    const query = { boardId: this._id };
    if (this.isTemplatesBoard()) {
      query.type = 'template-list';
      query.archived = false;
    } else {
      query.type = {$nin: ['template-list']};
    }
    const projection = { limit: 10, sort: { createdAt: -1 } };

    if (term) {
      const regex = new RegExp(term, 'i');

      query.$or = [
        { title: regex },
        { description: regex },
      ];
    }

    return Lists.find(query, projection);
  },

  searchCards(term, excludeLinked) {
    check(term, Match.OneOf(String, null, undefined));

    const query = { boardId: this._id };
    if (excludeLinked) {
      query.linkedId = null;
    }
    if (this.isTemplatesBoard()) {
      query.type = 'template-card';
      query.archived = false;
    } else {
      query.type = {$nin: ['template-card']};
    }
    const projection = { limit: 10, sort: { createdAt: -1 } };

    if (term) {
      const regex = new RegExp(term, 'i');

      query.$or = [
        { title: regex },
        { description: regex },
      ];
    }

    return Cards.find(query, projection);
  },
  // A board alwasy has another board where it deposits subtasks of thasks
  // that belong to itself.
  getDefaultSubtasksBoardId() {
    if ((this.subtasksDefaultBoardId === null) || (this.subtasksDefaultBoardId === undefined)) {
      this.subtasksDefaultBoardId = Boards.insert({
        title: `^${this.title}^`,
        permission: this.permission,
        members: this.members,
        color: this.color,
        description: TAPi18n.__('default-subtasks-board', {board: this.title}),
      });

      Swimlanes.insert({
        title: TAPi18n.__('default'),
        boardId: this.subtasksDefaultBoardId,
      });
      Boards.update(this._id, {$set: {
        subtasksDefaultBoardId: this.subtasksDefaultBoardId,
      }});
    }
    return this.subtasksDefaultBoardId;
  },

  getDefaultSubtasksBoard() {
    return Boards.findOne(this.getDefaultSubtasksBoardId());
  },

  getDefaultSubtasksListId() {
    if ((this.subtasksDefaultListId === null) || (this.subtasksDefaultListId === undefined)) {
      this.subtasksDefaultListId = Lists.insert({
        title: TAPi18n.__('queue'),
        boardId: this._id,
      });
      this.setSubtasksDefaultListId(this.subtasksDefaultListId);
    }
    return this.subtasksDefaultListId;
  },

  getDefaultSubtasksList() {
    return Lists.findOne(this.getDefaultSubtasksListId());
  },

  getDefaultSwimline() {
    let result = Swimlanes.findOne({boardId: this._id});
    if (result === undefined) {
      Swimlanes.insert({
        title: TAPi18n.__('default'),
        boardId: this._id,
      });
      result = Swimlanes.findOne({boardId: this._id});
    }
    return result;
  },

  cardsInInterval(start, end) {
    return Cards.find({
      boardId: this._id,
      $or: [
        {
          startAt: {
            $lte: start,
          }, endAt: {
            $gte: start,
          },
        }, {
          startAt: {
            $lte: end,
          }, endAt: {
            $gte: end,
          },
        }, {
          startAt: {
            $gte: start,
          }, endAt: {
            $lte: end,
          },
        },
      ],
    });
  },

  isTemplateBoard() {
    return this.type === 'template-board';
  },

  isTemplatesBoard() {
    return this.type === 'template-container';
  },
});


Boards.mutations({
  archive() {
    return { $set: { archived: true } };
  },

  restore() {
    return { $set: { archived: false } };
  },

  rename(title) {
    return { $set: { title } };
  },

  setDescription(description) {
    return { $set: { description } };
  },

  setColor(color) {
    return { $set: { color } };
  },

  setVisibility(visibility) {
    return { $set: { permission: visibility } };
  },

  addLabel(name, color) {
    // If label with the same name and color already exists we don't want to
    // create another one because they would be indistinguishable in the UI
    // (they would still have different `_id` but that is not exposed to the
    // user).
    if (!this.getLabel(name, color)) {
      const _id = Random.id(6);
      return { $push: { labels: { _id, name, color } } };
    }
    return {};
  },

  editLabel(labelId, name, color) {
    if (!this.getLabel(name, color)) {
      const labelIndex = this.labelIndex(labelId);
      return {
        $set: {
          [`labels.${labelIndex}.name`]: name,
          [`labels.${labelIndex}.color`]: color,
        },
      };
    }
    return {};
  },

  removeLabel(labelId) {
    return { $pull: { labels: { _id: labelId } } };
  },

  changeOwnership(fromId, toId) {
    const memberIndex = this.memberIndex(fromId);
    return {
      $set: {
        [`members.${memberIndex}.userId`]: toId,
      },
    };
  },

  addMember(memberId) {
    const memberIndex = this.memberIndex(memberId);
    if (memberIndex >= 0) {
      return {
        $set: {
          [`members.${memberIndex}.isActive`]: true,
        },
      };
    }

    return {
      $push: {
        members: {
          userId: memberId,
          isAdmin: false,
          isActive: true,
          isNoComments: false,
          isCommentOnly: false,
        },
      },
    };
  },

  removeMember(memberId) {
    const memberIndex = this.memberIndex(memberId);

    // we do not allow the only one admin to be removed
    const allowRemove = (!this.members[memberIndex].isAdmin) || (this.activeAdmins().length > 1);
    if (!allowRemove) {
      return {
        $set: {
          [`members.${memberIndex}.isActive`]: true,
        },
      };
    } else {
      return {
        $pull: {
        	members: {
	  				'userId': memberId
	  			}
        },
      };
    }
  },

  setMemberPermission(memberId, isAdmin, isNoComments, isCommentOnly, currentUserId = Meteor.userId()) {
    const memberIndex = this.memberIndex(memberId);
    // do not allow change permission of self
    if (memberId === currentUserId) {
      isAdmin = this.members[memberIndex].isAdmin;
    }

    return {
      $set: {
        [`members.${memberIndex}.isAdmin`]: isAdmin,
        [`members.${memberIndex}.isNoComments`]: isNoComments,
        [`members.${memberIndex}.isCommentOnly`]: isCommentOnly,
      },
    };
  },

  setAllowsSubtasks(allowsSubtasks) {
    return { $set: { allowsSubtasks } };
  },

  setSubtasksDefaultBoardId(subtasksDefaultBoardId) {
    return { $set: { subtasksDefaultBoardId } };
  },

  setSubtasksDefaultListId(subtasksDefaultListId) {
    return { $set: { subtasksDefaultListId } };
  },

  setPresentParentTask(presentParentTask) {
    return { $set: { presentParentTask } };
  },
});

function boardRemover(userId, doc) {
  [Cards, Lists, Swimlanes, Integrations, Rules, Activities].forEach((element) => {
    element.remove({ boardId: doc._id });
  });
}


if (Meteor.isServer) {
  Boards.allow({
    insert: Meteor.userId,
    update: Meteor.userId,
    remove: allowIsBoardAdmin,
    fetch: ['members'],
  });

  // The number of users that have starred this board is managed by trusted code
  // and the user is not allowed to update it
  Boards.deny({
    update(userId, board, fieldNames) {
      return _.contains(fieldNames, 'stars');
    },
    fetch: [],
  });

  // We can't remove a member if it is the last administrator
  Boards.deny({
    update(userId, doc, fieldNames, modifier) {
      if (!_.contains(fieldNames, 'members'))
        return false;

      // We only care in case of a $pull operation, ie remove a member
      if (!_.isObject(modifier.$pull && modifier.$pull.members))
        return false;

      // If there is more than one admin, it's ok to remove anyone
      const nbAdmins = _.where(doc.members, { isActive: true, isAdmin: true }).length;
      if (nbAdmins > 1)
        return false;

      // If all the previous conditions were verified, we can't remove
      // a user if it's an admin
      const removedMemberId = modifier.$pull.members.userId;
      return Boolean(_.findWhere(doc.members, {
        userId: removedMemberId,
        isAdmin: true,
      }));
    },
    fetch: ['members'],
  });

  Meteor.methods({
    quitBoard(boardId) {
      check(boardId, String);
      const board = Boards.findOne(boardId);
      if (board) {
        const userId = Meteor.userId();
        const index = board.memberIndex(userId);
        if (index >= 0) {
          board.removeMember(userId);
          return true;
        } else throw new Meteor.Error('error-board-notAMember');
      } else throw new Meteor.Error('error-board-doesNotExist');
    },

    archiveBoard(boardId) {
      check(boardId, String);
      const board = Boards.findOne(boardId);
      if (board) {
        const userId = Meteor.userId();
        const index = board.memberIndex(userId);
        if (index >= 0) {
          if (board.type && board.type == 'template-board') {
          	Cards.update(
        			{ linkedId: board._id },
        			{ $set: { archived: true } }
      			);
          }
          board.archive();
          return true;
        } else throw new Meteor.Error('error-board-notAMember');
      } else throw new Meteor.Error('error-board-doesNotExist');
    },
  });
}

if (Meteor.isServer) {
  Meteor.startup(() => {
    var boardTemplates = Boards.find({
      type: 'template-board',
      archived: false,
    });
    var managerRole = Roles.findOne({name: 'Manager'});
    var managerRoleId = null;
    if (managerRole && managerRole._id) {
    	managerRoleId = managerRole._id;
    }
    var adminsOrManagers = Users.find({
    	$or: [
    		{ isAdmin: true },
    		{ roleId: managerRoleId }
  		]
    });
    boardTemplates.forEach((boardTemplate) => {
    	adminsOrManagers.forEach((adminOrManager) => {
    		var boardTemplateId = boardTemplate._id;
    		var boardTemplateMembers = boardTemplate.members;
    		var adminOrManagerId = adminOrManager._id;
  			isMember = false;
    		boardTemplateMembers.forEach((boardTemplateMember) => {
      		if (boardTemplateMember.userId == adminOrManagerId) {
      			isMember = true;
      		}
        });
    		if (isMember === false) {
          Boards.update(
            { _id: boardTemplateId },
            { $push: {
	              members: {
	                isAdmin: false,
	                isActive: true,
	                isCommentOnly: false,
	                userId: adminOrManagerId,
	              },
	            },
            }
          );
    		}
      });
    });

    // Let MongoDB ensure that a member is not included twice in the same board
    Boards._collection._ensureIndex({
      _id: 1,
      'members.userId': 1,
    }, { unique: true });
    Boards._collection._ensureIndex({ 'members.userId': 1 });
  });

  Boards.after.insert((userId, doc) => {

    // Genesis: the first activity of the newly created board
    Activities.insert({
      userId,
      type: 'board',
      activityTypeId: doc._id,
      activityType: 'createBoard',
      boardId: doc._id,
    });
  	//_______________________//


    // Have the document UserGroup, which's field boardsQuota was used for this addition, gets its field usedBoardsQuota updated
  	// And update the board's field quotaGroupId with the _id of the UserGroup which's quota was used.
    const insertedBoard = Boards.findOne({ _id: doc._id });
    if (insertedBoard && insertedBoard._id) {
      const specificQuotaGroupId = insertedBoard.quotaGroupId;
      // Check if the user had selected any specifc user group's quota to use or not!
      if (specificQuotaGroupId && specificQuotaGroupId.length > 0) {
    		const userGroup = UserGroups.findOne({_id: specificQuotaGroupId});
    		if (userGroup && userGroup._id) {
    			var usedQuota = userGroup.usedBoardsQuota  + 1;
    			// Update usedUsersQuota in UserGroups
    			UserGroups.update(
  					{ _id: userGroup._id },
  					{ $set: { usedBoardsQuota: usedQuota } }
  				);
          // Update quotaGroupId in Boards
          Boards.update(
            { _id: doc._id },
            { $set: { quotaGroupId: userGroup._id } }
          );
    		}
      } else {
      	const userAssignedUserGroups = AssignedUserGroups.find({ userId }, {$sort: {groupOrder: 1}} ).fetch();
      	for (var i = 0; i < userAssignedUserGroups.length; i++) {
      		const userGroup = UserGroups.findOne({_id: userAssignedUserGroups[i].userGroupId});
      		if (userGroup && userGroup._id) {
        		var quotaDifference = userGroup.boardsQuota - userGroup.usedBoardsQuota;
        		if (quotaDifference > 0) {
        			var usedQuota = userGroup.usedBoardsQuota  + 1;
        			// Update usedUsersQuota in UserGroups
        			UserGroups.update(
      					{ _id: userGroup._id },
      					{ $set: { usedBoardsQuota: usedQuota } }
      				);
        			// Update quotaGroupId in Boards
        			Boards.update(
      					{ _id: doc._id },
      					{ $set: { quotaGroupId: userGroup._id } }
      				);
        			break;
        		}
      		}
      	};
      }
    }
  	//_______________________//

  });

  // If the user remove one label from a board, we cant to remove reference of
  // this label in any card of this board.
  Boards.after.update((userId, doc, fieldNames, modifier) => {
    if (!_.contains(fieldNames, 'labels') ||
      !modifier.$pull ||
      !modifier.$pull.labels ||
      !modifier.$pull.labels._id) {
      return;
    }

    const removedLabelId = modifier.$pull.labels._id;
    Cards.update(
      { boardId: doc._id },
      {
        $pull: {
          labelIds: removedLabelId,
        },
      },
      { multi: true }
    );
  });

  const foreachRemovedMember = (doc, modifier, callback) => {
    Object.keys(modifier).forEach((set) => {
      if (modifier[set] !== false) {
        return;
      }

      const parts = set.split('.');
      if (parts.length === 3 && parts[0] === 'members' && parts[2] === 'isActive') {
        callback(doc.members[parts[1]].userId);
      }
    });
  };

  Boards.before.insert((insertorId) => {

  	function defaultTrialBoardsQuota() {
      return 10;
    }

		//	Check in AssignedUserGroup whether the user has any user group assigned to it,
		//	if so, it would in turn check if he's exhausted his quota of all the user groups assigned to him or not in order to proceed with the creation
		//	but if no user group is assigned to him, then the system needs to check in the model's collection to see how much of it has the user already created
		//	and whether he has exhausted his default trial quota
  	const userAssignedUserGroups = AssignedUserGroups.find({ userId: insertorId }, );
  	// If user has any AssignedUserGroup
  	if (userAssignedUserGroups.count() > 0) {
  		var boardsQuotaLeft = 0;
  		userAssignedUserGroups.forEach((assignedUserGroup) => {
  			const userGroup = UserGroups.findOne({_id: assignedUserGroup.userGroupId});
  			if (userGroup && userGroup.boardsQuota) {
  				boardsQuotaLeft += userGroup.boardsQuota - userGroup.usedBoardsQuota
  			}
  		});
  		if (boardsQuotaLeft > 0) {
  			return true;
  		} else {
	      throw new Meteor.Error('error-exhausted-boards-quota');
  		}
  	}
  	// Else we check with the Default Trial 'Boards Quota'
  	else {
    	const boardsCreatedByCurrentUserCount = Boards.find({createdBy: insertorId}).count();
			if (boardsCreatedByCurrentUserCount < defaultTrialBoardsQuota()) {
				return true;
			} else {
	      throw new Meteor.Error('error-exhausted-boards-quota');
			}
  	}

  });

  // Remove a member from all objects of the board before leaving the board
  Boards.before.update((userId, doc, fieldNames, modifier) => {
    if (!_.contains(fieldNames, 'members')) {
      return;
    }

    if (modifier.$set) {
      const boardId = doc._id;
      foreachRemovedMember(doc, modifier.$set, (memberId) => {
        Cards.update(
          { boardId },
          {
            $pull: {
              members: memberId,
              watchers: memberId,
            },
          },
          { multi: true }
        );

        Lists.update(
          { boardId },
          {
            $pull: {
              watchers: memberId,
            },
          },
          { multi: true }
        );

        const board = Boards._transform(doc);
        board.setWatcher(memberId, false);

        // Remove board from users starred list
        if (!board.isPublic()) {
          Users.update(
            memberId,
            {
              $pull: {
                'profile.starredBoards': boardId,
              },
            }
          );
        }
      });
    }
  });

  Boards.before.remove((userId, doc) => {
    boardRemover(userId, doc);
    // Add removeBoard activity to keep it
    Activities.insert({
      userId,
      type: 'board',
      activityTypeId: doc._id,
      activityType: 'removeBoard',
      boardId: doc._id,
    });
  });

  // Add a new activity if we add or remove a member to the board
  Boards.after.update((userId, doc, fieldNames, modifier) => {

  	// When member is added or removed
    if (_.contains(fieldNames, 'members')) {
      // Say hello to the new member
      if (modifier.$push && modifier.$push.members) {
        const memberId = modifier.$push.members.userId;
        Activities.insert({
          userId,
          memberId,
          type: 'member',
          activityType: 'addBoardMember',
          boardId: doc._id,
        });
      }

      // Say goodbye to the former member
      if (modifier.$pull) {
      	const memberId = modifier.$pull.members.userId;
      	Activities.insert({
          userId,
          memberId,
          type: 'member',
          activityType: 'removeBoardMember',
          boardId: doc._id,
        });
      }
    }

  	// When a board is archived or restored
    if (_.contains(fieldNames, 'archived')) {
      // record the activity of archiving the board
      if (modifier.$set && modifier.$set.archived && modifier.$set.archived === true) {
        Activities.insert({
          userId,
          type: 'board',
          activityTypeId: doc._id,
          activityType: 'archivedBoard',
          boardId: doc._id,
        });
      } else {  // record the activity of restoring the board
        Activities.insert({
          userId,
          type: 'board',
          activityTypeId: doc._id,
          activityType: 'restoredBoard',
          boardId: doc._id,
        });
      }
    }

  });

  // Method executed before deleting a board from the database
  Boards.before.remove((userId, doc) => {
    // CardScores, CardComments, Checklists, Activities and attachment gets removed
    // in post card deletion method (cardRemover())
    Cards.remove({
      boardId: doc._id
    });
    Lists.remove({
      boardId: doc._id
    });
    Swimlanes.remove({
      boardId: doc._id
    });
    Activities.remove({
      cardId: doc._id,
    });
    CustomFields.remove({
      boardId: doc._id
    });
    Integrations.remove({
      boardId: doc._id
    });

    // If it is a template board, then we have to also remove the linked-card
    // otherwise, if the upstream button 'Templates' on the header is clicked the templates
    // page keeps on loading, never displaying the data
    // For our Human Resources Application we have removed this button, since we won't be using it
    // but still, I've added this fix to allow a smooth transition whenever in the future when
    // we update to the latest updates of upstream
    if (doc.type === 'template-board') {
      Cards.remove({
        linkedId: doc._id
      });
    }

    // If the board was a categorised one, we remove its trace from the folder to which it belonged
    var userFolders = Folders.find({ userId: Meteor.userId() }).fetch();
    for (var i = 0; i < userFolders.length; i++) {
      var boardIds = new Array;
      var folderContents = userFolders[i].contents;
      if (typeof folderContents !== 'undefined' && folderContents !== null) {
        for (var k = 0; k < _.keys(folderContents).length; k++) {
          if (folderContents[k].boardId !== doc._id) {
            boardIds.push(folderContents[k].boardId);
          }
        }
      }
      Folders.update(
        { _id : userFolders[i]._id },
        { $unset: { contents : '' } }
      );
      for (var n = 0; n < boardIds.length; n++) {
        var keyName = 'contents.' + n + '.boardId';
        Folders.update(
          { _id: userFolders[i]._id },
          { $set: { [keyName] : boardIds[n] } }
        );
      }
    }

  });
}

//BOARDS REST API
if (Meteor.isServer) {
  /**
   * @operation get_boards_from_user
   * @summary Get all boards attached to a user
   *
   * @param {string} userId the ID of the user to retrieve the data
   * @return_type [{_id: string,
                    title: string}]
                    */
  JsonRoutes.add('GET', '/api/users/:userId/boards', function (req, res) {
    try {
      Authentication.checkLoggedIn(req.userId);
      const paramUserId = req.params.userId;
      // A normal user should be able to see their own boards,
      // admins can access boards of any user
      Authentication.checkAdminOrCondition(req.userId, req.userId === paramUserId);

      const data = Boards.find({
        archived: false,
        'members.userId': paramUserId,
      }, {
        sort: ['title'],
      }).map(function(board) {
        return {
          _id: board._id,
          title: board.title,
        };
      });

      JsonRoutes.sendResult(res, {code: 200, data});
    }
    catch (error) {
      JsonRoutes.sendResult(res, {
        code: 200,
        data: error,
      });
    }
  });

  /**
   * @operation get_public_boards
   * @summary Get all public boards
   *
   * @return_type [{_id: string,
                    title: string}]
                    */
  JsonRoutes.add('GET', '/api/boards', function (req, res) {
    try {
      Authentication.checkUserId(req.userId);
      JsonRoutes.sendResult(res, {
        code: 200,
        data: Boards.find({ permission: 'public' }).map(function (doc) {
          return {
            _id: doc._id,
            title: doc.title,
          };
        }),
      });
    }
    catch (error) {
      JsonRoutes.sendResult(res, {
        code: 200,
        data: error,
      });
    }
  });

  /**
   * @operation get_board
   * @summary Get the board with that particular ID
   *
   * @param {string} boardId the ID of the board to retrieve the data
   * @return_type Boards
   */
  JsonRoutes.add('GET', '/api/boards/:boardId', function (req, res) {
    try {
      const id = req.params.boardId;
      Authentication.checkBoardAccess(req.userId, id);

      JsonRoutes.sendResult(res, {
        code: 200,
        data: Boards.findOne({ _id: id }),
      });
    }
    catch (error) {
      JsonRoutes.sendResult(res, {
        code: 200,
        data: error,
      });
    }
  });

  /**
   * @operation new_board
   * @summary Create a board
   *
   * @description This allows to create a board.
   *
   * The color has to be chosen between `belize`, `nephritis`, `pomegranate`,
   * `pumpkin`, `wisteria`, `midnight`:
   *
   * <img src="https://wekan.github.io/board-colors.png" width="40%" alt="Wekan logo" />
   *
   * @param {string} title the new title of the board
   * @param {string} owner "ABCDE12345" <= User ID in Wekan.
   *                 (Not username or email)
   * @param {boolean} [isAdmin] is the owner an admin of the board (default true)
   * @param {boolean} [isActive] is the board active (default true)
   * @param {boolean} [isNoComments] disable comments (default false)
   * @param {boolean} [isCommentOnly] only enable comments (default false)
   * @param {string} [permission] "private" board <== Set to "public" if you
   *                 want public Wekan board
   * @param {string} [color] the color of the board
   *
   * @return_type {_id: string,
                   defaultSwimlaneId: string}
                   */
  JsonRoutes.add('POST', '/api/boards', function (req, res) {
    try {
      Authentication.checkUserId(req.userId);
      const id = Boards.insert({
        title: req.body.title,
        members: [
          {
            userId: req.body.owner,
            isAdmin: req.body.isAdmin || true,
            isActive: req.body.isActive || true,
            isNoComments: req.body.isNoComments || false,
            isCommentOnly: req.body.isCommentOnly || false,
          },
        ],
        permission: req.body.permission || 'private',
        color: req.body.color || 'belize',
      });
      const swimlaneId = Swimlanes.insert({
        title: TAPi18n.__('default'),
        boardId: id,
      });
      JsonRoutes.sendResult(res, {
        code: 200,
        data: {
          _id: id,
          defaultSwimlaneId: swimlaneId,
        },
      });
    }
    catch (error) {
      JsonRoutes.sendResult(res, {
        code: 200,
        data: error,
      });
    }
  });

  /**
   * @operation delete_board
   * @summary Delete a board
   *
   * @param {string} boardId the ID of the board
   */
  JsonRoutes.add('DELETE', '/api/boards/:boardId', function (req, res) {
    try {
      Authentication.checkUserId(req.userId);
      const id = req.params.boardId;
      Boards.remove({ _id: id });
      JsonRoutes.sendResult(res, {
        code: 200,
        data:{
          _id: id,
        },
      });
    }
    catch (error) {
      JsonRoutes.sendResult(res, {
        code: 200,
        data: error,
      });
    }
  });

  /**
   * @operation add_board_label
   * @summary Add a label to a board
   *
   * @description If the board doesn't have the name/color label, this function
   * adds the label to the board.
   *
   * @param {string} boardId the board
   * @param {string} color the color of the new label
   * @param {string} name the name of the new label
   *
   * @return_type string
   */
  JsonRoutes.add('PUT', '/api/boards/:boardId/labels', function (req, res) {
    Authentication.checkUserId(req.userId);
    const id = req.params.boardId;
    try {
      if (req.body.hasOwnProperty('label')) {
        const board = Boards.findOne({ _id: id });
        const color = req.body.label.color;
        const name = req.body.label.name;
        const labelId = Random.id(6);
        if (!board.getLabel(name, color)) {
          Boards.direct.update({ _id: id }, { $push: { labels: { _id: labelId,  name,  color } } });
          JsonRoutes.sendResult(res, {
            code: 200,
            data: labelId,
          });
        } else {
          JsonRoutes.sendResult(res, {
            code: 200,
          });
        }
      }
    }
    catch (error) {
      JsonRoutes.sendResult(res, {
        data: error,
      });
    }
  });

  /**
   * @operation set_board_member_permission
   * @tag Users
   * @summary Change the permission of a member of a board
   *
   * @param {string} boardId the ID of the board that we are changing
   * @param {string} memberId the ID of the user to change permissions
   * @param {boolean} isAdmin admin capability
   * @param {boolean} isNoComments NoComments capability
   * @param {boolean} isCommentOnly CommentsOnly capability
   */
  JsonRoutes.add('POST', '/api/boards/:boardId/members/:memberId', function (req, res) {
    try {
      const boardId = req.params.boardId;
      const memberId = req.params.memberId;
      const {isAdmin, isNoComments, isCommentOnly} = req.body;
      Authentication.checkBoardAccess(req.userId, boardId);
      const board = Boards.findOne({ _id: boardId });
      function isTrue(data){
        try {
          return data.toLowerCase() === 'true';
        }
        catch (error) {
          return data;
        }
      }
      const query = board.setMemberPermission(memberId, isTrue(isAdmin), isTrue(isNoComments), isTrue(isCommentOnly), req.userId);

      JsonRoutes.sendResult(res, {
        code: 200,
        data: query,
      });
    }
    catch (error) {
      JsonRoutes.sendResult(res, {
        code: 200,
        data: error,
      });
    }
  });
}
