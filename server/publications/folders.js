Meteor.publish('folders', function() {
  return Folders.find();
});

Meteor.publish('userFolders', function() {
  return Folders.find({
  	userId: Meteor.userId()
  });
});
