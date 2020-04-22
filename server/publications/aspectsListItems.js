Meteor.publish('aspects_list_items', function() {
  return AspectsListItems.find();
});
