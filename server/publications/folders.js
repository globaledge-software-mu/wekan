Meteor.publish('folders', function() {
  return Folders.find();
});
