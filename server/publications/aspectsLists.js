Meteor.publish('aspects_lists', function() {
  return AspectsLists.find();
});
