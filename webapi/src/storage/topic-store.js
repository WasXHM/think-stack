import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { basename, dirname, join } from 'node:path';

import { AppError, NotFoundError, StorageError } from '../core/errors.js';
import { isUuid, validateUuid } from '../core/ids.js';
import {
  assembleTopic,
  createExternalAnswerRecord,
  createTopicRecord,
  createUnderstandingRecord,
  deserializeExternalAnswer,
  deserializeTopic,
  deserializeUnderstanding,
  serializeExternalAnswer,
  serializeTopic,
  serializeUnderstanding,
  toTopicListItem,
  updateExternalAnswerRecord,
  updateTopicRecord,
  updateUnderstandingRecord,
} from '../models/index.js';

const TOPIC_FILE = 'topic.json';
const EXTERNAL_ANSWERS_DIRECTORY = 'external-answers';
const UNDERSTANDINGS_DIRECTORY = 'understandings';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nextTimestamp(...previousTimestamps) {
  const previousMaximum = previousTimestamps.reduce((maximum, value) => {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? Math.max(maximum, parsed) : maximum;
  }, 0);

  return new Date(Math.max(Date.now(), previousMaximum + 1)).toISOString();
}

function sortByCreation(left, right) {
  return left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);
}

function topicNotFound(topicId) {
  return new NotFoundError(`Topic ${topicId} was not found`, 'TOPIC_NOT_FOUND');
}

function childNotFound(kind, childId, topicId) {
  const label = kind === 'external-answer' ? 'External answer' : 'Understanding';
  const code = kind === 'external-answer' ? 'EXTERNAL_ANSWER_NOT_FOUND' : 'UNDERSTANDING_NOT_FOUND';
  return new NotFoundError(`${label} ${childId} was not found in topic ${topicId}`, code);
}

export class FileTopicStore {
  #initializing;

  #operationTail = Promise.resolve();

  constructor({ resourcesDir }) {
    if (typeof resourcesDir !== 'string' || resourcesDir.trim() === '') {
      throw new TypeError('resourcesDir is required');
    }

    this.resourcesDir = resourcesDir;
    this.topicsDir = join(resourcesDir, 'topics');
  }

  async initialize() {
    if (!this.#initializing) {
      this.#initializing = (async () => {
        await mkdir(this.topicsDir, { recursive: true });
        await this.#cleanupTombstones();
      })().catch((error) => {
        this.#initializing = undefined;
        throw new StorageError('Unable to initialize topic storage', error);
      });
    }

    await this.#initializing;
  }

  async inspect() {
    return this.#enqueueOperation(async () => {
      try {
        const entries = await readdir(this.topicsDir, { withFileTypes: true });
        return {
          driver: 'filesystem',
          status: 'ready',
          topicCount: entries.filter((entry) => entry.isDirectory() && isUuid(entry.name)).length,
        };
      } catch (error) {
        throw this.#mapStorageError(error, 'Unable to inspect topic storage');
      }
    });
  }

  async listTopics({ query = '' } = {}) {
    return this.#enqueueOperation(async () => {
      try {
        const entries = await readdir(this.topicsDir, { withFileTypes: true });
        const topicIds = entries
          .filter((entry) => entry.isDirectory() && isUuid(entry.name))
          .map((entry) => entry.name);
        const settledTopics = await Promise.allSettled(topicIds.map(async (topicId) => {
          const topic = await this.#readTopicRecord(topicId);
          const [externalAnswerCount, understandingCount] = await Promise.all([
            this.#countCollection(topicId, EXTERNAL_ANSWERS_DIRECTORY),
            this.#countCollection(topicId, UNDERSTANDINGS_DIRECTORY),
          ]);
          return { ...topic, externalAnswerCount, understandingCount };
        }));
        const topics = settledTopics.map((result) => {
          if (result.status === 'fulfilled') {
            return result.value;
          }
          if (result.reason instanceof NotFoundError) {
            throw new AppError({
              status: 500,
              code: 'CORRUPT_RESOURCE',
              message: 'A topic resource directory is missing topic.json',
              expose: false,
              cause: result.reason,
            });
          }
          throw result.reason;
        });
        const normalizedQuery = query.toLocaleLowerCase();
        const matchingTopics = normalizedQuery
          ? topics.filter((topic) => (
            topic.title.toLocaleLowerCase().includes(normalizedQuery)
            || topic.question.toLocaleLowerCase().includes(normalizedQuery)
          ))
          : topics;
        const items = matchingTopics
          .sort((left, right) => (
            right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id)
          ))
          .map(toTopicListItem);

        return { items, total: items.length, query };
      } catch (error) {
        throw this.#mapStorageError(error, 'Unable to list topics');
      }
    });
  }

  async getTopic(topicId) {
    const normalizedTopicId = validateUuid(topicId, 'topicId');
    return this.#enqueueOperation(async () => {
      try {
        return await this.#readCompleteTopic(normalizedTopicId);
      } catch (error) {
        throw this.#mapStorageError(error, `Unable to read topic ${normalizedTopicId}`);
      }
    });
  }

  async createTopic({ title, question }) {
    return this.#enqueueOperation(async () => {
      const id = randomUUID();
      const timestamp = new Date().toISOString();
      const topic = createTopicRecord({ id, title, question, timestamp });
      const topicDirectory = this.#topicDirectory(id);

      try {
        await mkdir(topicDirectory);
        await mkdir(this.#collectionDirectory(id, EXTERNAL_ANSWERS_DIRECTORY));
        await mkdir(this.#collectionDirectory(id, UNDERSTANDINGS_DIRECTORY));
        await this.#writeTopicRecord(topic);
        return this.#decorateTopic(topic, [], []);
      } catch (error) {
        await rm(topicDirectory, { recursive: true, force: true }).catch(() => {});
        throw this.#mapStorageError(error, 'Unable to create topic');
      }
    });
  }

  async updateTopic(topicId, changes) {
    const normalizedTopicId = validateUuid(topicId, 'topicId');

    return this.#enqueueOperation(async () => {
      try {
        const current = await this.#readTopicRecord(normalizedTopicId);
        const updated = updateTopicRecord(current, changes, nextTimestamp(current.updatedAt));
        await this.#writeTopicRecord(updated);
        const [externalAnswers, understandings] = await Promise.all([
          this.#readCollection(normalizedTopicId, EXTERNAL_ANSWERS_DIRECTORY),
          this.#readCollection(normalizedTopicId, UNDERSTANDINGS_DIRECTORY),
        ]);
        return this.#decorateTopic(updated, externalAnswers, understandings);
      } catch (error) {
        throw this.#mapStorageError(error, `Unable to update topic ${normalizedTopicId}`);
      }
    });
  }

  async deleteTopic(topicId) {
    const normalizedTopicId = validateUuid(topicId, 'topicId');

    return this.#enqueueOperation(async () => {
      const topicDirectory = this.#topicDirectory(normalizedTopicId);
      const tombstoneDirectory = join(
        this.topicsDir,
        `.deleted-${normalizedTopicId}-${randomUUID()}`,
      );

      try {
        await this.#readTopicRecord(normalizedTopicId);
        await rename(topicDirectory, tombstoneDirectory);
        await rm(tombstoneDirectory, { recursive: true, force: true }).catch(() => {});
      } catch (error) {
        throw this.#mapStorageError(error, `Unable to delete topic ${normalizedTopicId}`);
      }
    });
  }

  async createExternalAnswer(topicId, input) {
    return this.#createChild(topicId, EXTERNAL_ANSWERS_DIRECTORY, {
      source: input.source,
      content: input.content,
    });
  }

  async updateExternalAnswer(topicId, answerId, changes) {
    return this.#updateChild(
      topicId,
      answerId,
      EXTERNAL_ANSWERS_DIRECTORY,
      changes,
    );
  }

  async deleteExternalAnswer(topicId, answerId) {
    return this.#deleteChild(topicId, answerId, EXTERNAL_ANSWERS_DIRECTORY);
  }

  async createUnderstanding(topicId, input) {
    return this.#createChild(topicId, UNDERSTANDINGS_DIRECTORY, {
      content: input.content,
    });
  }

  async updateUnderstanding(topicId, understandingId, changes) {
    return this.#updateChild(
      topicId,
      understandingId,
      UNDERSTANDINGS_DIRECTORY,
      changes,
    );
  }

  async deleteUnderstanding(topicId, understandingId) {
    return this.#deleteChild(topicId, understandingId, UNDERSTANDINGS_DIRECTORY);
  }

  async #createChild(topicId, collection, values) {
    const normalizedTopicId = validateUuid(topicId, 'topicId');

    return this.#enqueueOperation(async () => {
      const childId = randomUUID();
      const childFile = this.#childFile(normalizedTopicId, collection, childId);

      try {
        const topic = await this.#readTopicRecord(normalizedTopicId);
        const timestamp = nextTimestamp(topic.updatedAt);
        const child = collection === EXTERNAL_ANSWERS_DIRECTORY
          ? createExternalAnswerRecord({
            id: childId,
            topicId: normalizedTopicId,
            ...values,
            timestamp,
          })
          : createUnderstandingRecord({
            id: childId,
            topicId: normalizedTopicId,
            ...values,
            timestamp,
          });
        const updatedTopic = updateTopicRecord(topic, {}, timestamp);

        await this.#writeChildRecord(collection, childFile, child);
        try {
          await this.#writeTopicRecord(updatedTopic);
        } catch (error) {
          await unlink(childFile).catch(() => {});
          throw error;
        }

        return child;
      } catch (error) {
        throw this.#mapStorageError(error, `Unable to add content to topic ${normalizedTopicId}`);
      }
    });
  }

  async #updateChild(topicId, childId, collection, changes) {
    const normalizedTopicId = validateUuid(topicId, 'topicId');
    const normalizedChildId = validateUuid(
      childId,
      collection === EXTERNAL_ANSWERS_DIRECTORY ? 'answerId' : 'understandingId',
    );

    return this.#enqueueOperation(async () => {
      const childFile = this.#childFile(normalizedTopicId, collection, normalizedChildId);

      try {
        const [topic, current] = await Promise.all([
          this.#readTopicRecord(normalizedTopicId),
          this.#readChildRecord(normalizedTopicId, collection, normalizedChildId),
        ]);
        const timestamp = nextTimestamp(topic.updatedAt, current.updatedAt);
        const updatedChild = collection === EXTERNAL_ANSWERS_DIRECTORY
          ? updateExternalAnswerRecord(current, changes, timestamp)
          : updateUnderstandingRecord(current, changes, timestamp);
        const updatedTopic = updateTopicRecord(topic, {}, timestamp);

        await this.#writeChildRecord(collection, childFile, updatedChild);
        try {
          await this.#writeTopicRecord(updatedTopic);
        } catch (error) {
          await this.#writeChildRecord(collection, childFile, current).catch(() => {});
          throw error;
        }

        return updatedChild;
      } catch (error) {
        throw this.#mapStorageError(error, `Unable to update content in topic ${normalizedTopicId}`);
      }
    });
  }

  async #deleteChild(topicId, childId, collection) {
    const normalizedTopicId = validateUuid(topicId, 'topicId');
    const normalizedChildId = validateUuid(
      childId,
      collection === EXTERNAL_ANSWERS_DIRECTORY ? 'answerId' : 'understandingId',
    );

    return this.#enqueueOperation(async () => {
      const childFile = this.#childFile(normalizedTopicId, collection, normalizedChildId);
      const tombstoneFile = join(
        dirname(childFile),
        `.deleted-${normalizedChildId}-${randomUUID()}.json`,
      );

      try {
        const [topic] = await Promise.all([
          this.#readTopicRecord(normalizedTopicId),
          this.#readChildRecord(normalizedTopicId, collection, normalizedChildId),
        ]);
        const updatedTopic = updateTopicRecord(topic, {}, nextTimestamp(topic.updatedAt));

        await rename(childFile, tombstoneFile);
        try {
          await this.#writeTopicRecord(updatedTopic);
        } catch (error) {
          await rename(tombstoneFile, childFile).catch(() => {});
          throw error;
        }
        await unlink(tombstoneFile).catch(() => {});
      } catch (error) {
        throw this.#mapStorageError(error, `Unable to delete content from topic ${normalizedTopicId}`);
      }
    });
  }

  async #enqueueOperation(operation) {
    await this.initialize();
    const queued = this.#operationTail.then(operation, operation);
    this.#operationTail = queued.catch(() => {});
    return queued;
  }

  async #readCompleteTopic(topicId) {
    const topic = await this.#readTopicRecord(topicId);
    const [externalAnswers, understandings] = await Promise.all([
      this.#readCollection(topicId, EXTERNAL_ANSWERS_DIRECTORY),
      this.#readCollection(topicId, UNDERSTANDINGS_DIRECTORY),
    ]);

    return this.#decorateTopic(topic, externalAnswers, understandings);
  }

  #decorateTopic(topic, externalAnswers, understandings) {
    return assembleTopic(
      topic,
      externalAnswers.sort(sortByCreation),
      understandings.sort(sortByCreation),
    );
  }

  async #readTopicRecord(topicId) {
    const value = await this.#readJson(this.#topicFile(topicId), () => topicNotFound(topicId));
    return deserializeTopic(value);
  }

  async #readChildRecord(topicId, collection, childId) {
    const kind = collection === EXTERNAL_ANSWERS_DIRECTORY
      ? 'external-answer'
      : 'understanding';
    const value = await this.#readJson(
      this.#childFile(topicId, collection, childId),
      () => childNotFound(kind, childId, topicId),
    );
    const child = collection === EXTERNAL_ANSWERS_DIRECTORY
      ? deserializeExternalAnswer(value)
      : deserializeUnderstanding(value);

    if (child.id !== childId || child.topicId !== topicId) {
      throw new AppError({
        status: 500,
        code: 'CORRUPT_RESOURCE',
        message: 'A stored topic resource is linked incorrectly',
        expose: false,
      });
    }

    return child;
  }

  async #readCollection(topicId, collection) {
    const collectionDirectory = this.#collectionDirectory(topicId, collection);
    let entries;

    try {
      entries = await readdir(collectionDirectory, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw this.#missingCollectionError(topicId, collection);
      }
      throw error;
    }

    const childIds = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => basename(entry.name, '.json'))
      .filter(isUuid);
    const settledChildren = await Promise.allSettled(
      childIds.map((childId) => this.#readChildRecord(topicId, collection, childId)),
    );

    return settledChildren.flatMap((result) => {
      if (result.status === 'fulfilled') {
        return [result.value];
      }

      if (result.reason instanceof NotFoundError) {
        return [];
      }

      throw result.reason;
    });
  }

  async #countCollection(topicId, collection) {
    try {
      const entries = await readdir(
        this.#collectionDirectory(topicId, collection),
        { withFileTypes: true },
      );
      return entries.filter((entry) => (
        entry.isFile()
        && entry.name.endsWith('.json')
        && isUuid(basename(entry.name, '.json'))
      )).length;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw this.#missingCollectionError(topicId, collection);
      }
      throw error;
    }
  }

  #missingCollectionError(topicId, collection) {
    return new AppError({
      status: 500,
      code: 'CORRUPT_RESOURCE',
      message: `Topic ${topicId} is missing its ${collection} resource directory`,
      expose: false,
    });
  }

  async #cleanupTombstones() {
    const topicEntries = await readdir(this.topicsDir, { withFileTypes: true });
    await Promise.all(topicEntries
      .filter((entry) => entry.name.startsWith('.deleted-'))
      .map((entry) => rm(join(this.topicsDir, entry.name), {
        recursive: true,
        force: true,
      }).catch(() => {})));

    const topicDirectories = topicEntries
      .filter((entry) => entry.isDirectory() && isUuid(entry.name))
      .map((entry) => join(this.topicsDir, entry.name));
    await Promise.all(topicDirectories.flatMap((topicDirectory) => (
      [topicDirectory, EXTERNAL_ANSWERS_DIRECTORY, UNDERSTANDINGS_DIRECTORY]
        .map((location, index) => (
          index === 0 ? location : join(topicDirectory, location)
        ))
        .map(async (directory) => {
          let entries;
          try {
            entries = await readdir(directory, { withFileTypes: true });
          } catch (error) {
            if (error.code === 'ENOENT') return;
            throw error;
          }
          await Promise.all(entries
            .filter((entry) => (
              entry.name.startsWith('.deleted-') || entry.name.endsWith('.tmp')
            ))
            .map((entry) => rm(join(directory, entry.name), {
              recursive: entry.isDirectory(),
              force: true,
            }).catch(() => {})));
        })
    )));
  }

  async #readJson(filePath, createNotFoundError) {
    let raw;

    try {
      raw = await readFile(filePath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw createNotFoundError();
      }
      throw error;
    }

    try {
      const value = JSON.parse(raw);
      if (!isPlainObject(value)) {
        throw new TypeError('Expected a JSON object');
      }
      return value;
    } catch (error) {
      throw new AppError({
        status: 500,
        code: 'CORRUPT_RESOURCE',
        message: 'A stored topic resource is invalid',
        expose: false,
        cause: error,
      });
    }
  }

  async #atomicWriteJson(filePath, value) {
    const temporaryFile = join(
      dirname(filePath),
      `.${basename(filePath)}.${process.pid}.${randomUUID()}.tmp`,
    );

    await mkdir(dirname(filePath), { recursive: true });

    try {
      await writeFile(temporaryFile, `${JSON.stringify(value, null, 2)}\n`, {
        encoding: 'utf8',
        flag: 'wx',
      });
      await rename(temporaryFile, filePath);
    } finally {
      await unlink(temporaryFile).catch(() => {});
    }
  }

  #writeTopicRecord(topic) {
    return this.#atomicWriteJson(this.#topicFile(topic.id), serializeTopic(topic));
  }

  #writeChildRecord(collection, filePath, child) {
    const serialized = collection === EXTERNAL_ANSWERS_DIRECTORY
      ? serializeExternalAnswer(child)
      : serializeUnderstanding(child);
    return this.#atomicWriteJson(filePath, serialized);
  }

  #topicDirectory(topicId) {
    return join(this.topicsDir, topicId);
  }

  #topicFile(topicId) {
    return join(this.#topicDirectory(topicId), TOPIC_FILE);
  }

  #collectionDirectory(topicId, collection) {
    return join(this.#topicDirectory(topicId), collection);
  }

  #childFile(topicId, collection, childId) {
    return join(this.#collectionDirectory(topicId, collection), `${childId}.json`);
  }

  #mapStorageError(error, message) {
    if (error instanceof AppError) {
      return error;
    }

    return new StorageError(message, error);
  }
}
