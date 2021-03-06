ListProperties = new Mongo.Collection('list_properties');

ListProperties.attachSchema(new SimpleSchema({
  i18nKey: {
    type: String
  },
  visible: {
    type: Boolean,
    defaultValue: true
  },
  boardId: {
    type: String
  },
  listId: {
    type: String
  },
  alias: {
    type: String
  },
  useDateWarnings: {
    type: Boolean,
    defaultValue: false
  },
  useTime: {
    type: Boolean,
    defaultValue: true
  },
  color: {
    type: String,
    optional: true
  }
}));

ListProperties.helpers({
  copy(boardId, listId, alias, i18nKey, visible, useDateWarnings, useTime, color) {
  	var hasListProperty = ListProperties.findOne({
  		boardId: boardId,
  		listId: listId,
      alias: alias,
      i18nKey: i18nKey
  	});
  	if (!hasListProperty && color === 'undefined') {
      ListProperties.insert({
      	boardId: boardId,
      	listId: listId,
        alias: alias,
        i18nKey: i18nKey,
        visible: visible,
        useDateWarnings: useDateWarnings,
        useTime: useTime
      });
  	} else if (!hasListProperty && color !== 'undefined') {
      ListProperties.insert({
      	boardId: boardId,
      	listId: listId,
        alias: alias,
        i18nKey: i18nKey,
        visible: visible,
        useDateWarnings: useDateWarnings,
        useTime: useTime,
        color: color
      });
  	}
  },
});

ListProperties.allow({
  insert(userId, doc) {
    return allowIsBoardMember(userId, Boards.findOne(doc.boardId));
  },
  update(userId, doc) {
    return allowIsBoardMember(userId, Boards.findOne(doc.boardId));
  },
  remove(userId, doc) {
    return allowIsBoardMember(userId, Boards.findOne(doc.boardId));
  },
  fetch: ['listId', 'boardId']
});
