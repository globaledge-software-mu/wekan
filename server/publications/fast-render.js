import { FastRender } from 'meteor/staringatlights:fast-render';

FastRender.onAllRoutes(function() {
  this.subscribe('boards');
});

FastRender.route('/b/:id/:slug', function({ id }) {
  this.subscribe('board', id, false);
});

FastRender.route('/', function() {
  this.subscribe('userFolders');
  this.subscribe('templateBoards');
  this.subscribe('userCards');
  this.subscribe('boards');
});