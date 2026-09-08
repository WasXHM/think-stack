import Router from '@koa/router';

import {
  createExternalAnswer,
  createTopic,
  createUnderstanding,
  deleteExternalAnswer,
  deleteTopic,
  deleteUnderstanding,
  getTopic,
  listTopics,
  updateExternalAnswer,
  updateTopic,
  updateUnderstanding,
} from './controller.js';

const router = new Router({ prefix: '/topics' });

router.get('/', listTopics);
router.post('/', createTopic);
router.get('/:topicId', getTopic);
router.patch('/:topicId', updateTopic);
router.delete('/:topicId', deleteTopic);

router.post('/:topicId/external-answers', createExternalAnswer);
router.patch('/:topicId/external-answers/:answerId', updateExternalAnswer);
router.delete('/:topicId/external-answers/:answerId', deleteExternalAnswer);

router.post('/:topicId/understandings', createUnderstanding);
router.patch('/:topicId/understandings/:understandingId', updateUnderstanding);
router.delete('/:topicId/understandings/:understandingId', deleteUnderstanding);

export default router;
