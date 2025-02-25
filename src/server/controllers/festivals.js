import httpStatus from 'http-status';
import { EmptyResultError } from 'sequelize';
import stringify from 'csv-stringify';

import APIError from '~/server/helpers/errors';
import Artwork from '~/server/models/artwork';
import Festival from '~/server/models/festival';
import Vote from '~/server/models/vote';
import Question from '~/server/models/question';
import baseController from '~/server/controllers';
import {
  AnswerBelongsToArtwork,
  AnswerBelongsToProperty,
  ArtworkBelongsToArtist,
  ArtworkBelongsToManyFestivals,
  ArtworkHasManyImages,
  FestivalBelongsToManyArtworks,
  FestivalHasOneQuestion,
  FestivalHasManyDocuments,
  FestivalHasManyImages,
  FestivalHasManyQuestions,
  FestivalHasManyVoteweights,
  QuestionBelongsToArtwork,
  QuestionHasManyAnswers,
  answerFields,
  artistFields,
  artworkFields,
  baseFileFields,
  festivalFields,
  imageFileFields,
  propertyFields,
  questionFields,
  voteweightFields,
} from '~/server/database/associations';
import { filterResponseFields } from '~/server/controllers';
import { respondWithSuccess } from '~/server/helpers/respond';

const options = {
  model: Festival,
  fields: [
    ...festivalFields,
    'images',
    'artworks',
    'online',
    'voteweights',
    'question',
  ],
  fieldsProtected: ['documents', 'chainId'],
  include: [
    FestivalBelongsToManyArtworks,
    FestivalHasManyDocuments,
    FestivalHasManyImages,
    FestivalHasOneQuestion,
  ],
  associations: [
    {
      association: FestivalHasManyImages,
      fields: [...imageFileFields],
    },
    {
      association: FestivalHasManyDocuments,
      fields: [...baseFileFields],
    },
    {
      association: FestivalBelongsToManyArtworks,
      fields: [...artworkFields],
    },
  ],
};

const optionsCreate = {
  ...options,
  include: [FestivalHasOneQuestion],
};

const optionsRead = {
  ...options,
  include: [
    FestivalBelongsToManyArtworks,
    FestivalHasManyDocuments,
    FestivalHasManyImages,
    FestivalHasManyVoteweights,
    FestivalHasOneQuestion,
  ],
  associations: [
    {
      association: FestivalHasManyImages,
      fields: [...imageFileFields],
    },
    {
      association: FestivalHasManyDocuments,
      fields: [...baseFileFields],
    },
    {
      association: FestivalBelongsToManyArtworks,
      fields: [...artworkFields],
    },
    {
      association: FestivalHasManyVoteweights,
      fields: [...voteweightFields],
    },
  ],
};

const optionsWithQuestions = {
  model: Festival,
  fields: [...festivalFields, 'images', 'questions'],
  associations: [
    {
      association: FestivalHasManyImages,
      fields: [...imageFileFields],
    },
    {
      association: FestivalHasManyQuestions,
      fields: [...questionFields, 'artwork', 'answers'],
      associations: [
        {
          association: QuestionBelongsToArtwork,
          fields: [...artworkFields, 'artist'],
          associations: [
            {
              association: ArtworkBelongsToArtist,
              fields: [...artistFields],
            },
          ],
        },
        {
          association: QuestionHasManyAnswers,
          fields: [...answerFields, 'property', 'artwork'],
          associations: [
            {
              association: AnswerBelongsToArtwork,
              fields: [...artworkFields, 'images'],
              associations: [
                {
                  association: ArtworkHasManyImages,
                  fields: [...imageFileFields],
                },
              ],
            },
            {
              association: AnswerBelongsToProperty,
              fields: [...propertyFields],
            },
          ],
        },
      ],
    },
  ],
  include: [
    FestivalHasManyImages,
    {
      association: FestivalHasManyQuestions,
      include: [
        {
          association: QuestionBelongsToArtwork,
          include: [ArtworkBelongsToArtist],
        },
        {
          association: QuestionHasManyAnswers,
          include: [
            {
              association: AnswerBelongsToArtwork,
              include: [ArtworkHasManyImages],
            },
            AnswerBelongsToProperty,
          ],
        },
      ],
    },
  ],
};

async function getArtworks(req, res, next) {
  baseController.readAll({
    model: Artwork,
    fields: [...artworkFields, 'images', 'artist'],
    associations: [
      {
        association: ArtworkBelongsToArtist,
        fields: [...artistFields],
      },
      {
        association: ArtworkHasManyImages,
        fields: [...imageFileFields],
      },
    ],
    include: [
      {
        association: ArtworkBelongsToManyFestivals,
        where: {
          slug: req.params.slug,
        },
      },
      ArtworkBelongsToArtist,
      ArtworkHasManyImages,
    ],
  })(req, res, next);
}

async function getVotes(req, res, next) {
  if (req.get('Content-Type') === 'text/csv') {
    const { slug } = req.params;
    const { resource } = req.locals;

    try {
      const question = await Question.findOne({
        rejectOnEmpty: true,
        where: { festivalId: resource.id },
      });

      const votes = await Vote.findAll({
        rejectOnEmpty: true,
        where: { festivalQuestionChainId: question.chainId },
      });

      res.header('Content-Type', 'text/csv');
      res.attachment(`votes-${slug}.csv`);

      stringify(
        (votes || []).map((instance) => instance.get({ plain: true })),
        { header: true },
      ).pipe(res);
    } catch (error) {
      if (error instanceof EmptyResultError) {
        next(new APIError(httpStatus.NOT_FOUND));
      } else {
        next(error);
      }
    }
  } else {
    next(new APIError(httpStatus.NOT_FOUND));
  }
}

async function getQuestions(req, res, next) {
  // Request can be via `chainId` or database `id` or `slug`
  const where = {};
  if (Number.isInteger(req.params.idOrChainId)) {
    where.id = req.params.idOrChainId;
  } else if (req.params.idOrChainId.slice(0, 2) === '0x') {
    where.chainId = req.params.idOrChainId;
  } else {
    where.slug = req.params.idOrChainId;
  }

  try {
    const data = await Festival.findOne({
      rejectOnEmpty: true,
      include: optionsWithQuestions.include,
      where,
    });

    respondWithSuccess(
      res,
      filterResponseFields(req, data, optionsWithQuestions),
    );
  } catch (error) {
    if (error instanceof EmptyResultError) {
      next(new APIError(httpStatus.NOT_FOUND));
    } else {
      next(error);
    }
  }
}

function create(req, res, next) {
  baseController.create(optionsCreate, { include: true })(req, res, next);
}

function readAll(req, res, next) {
  baseController.readAll({
    ...optionsRead,
    where: req.locals && req.locals.query,
  })(req, res, next);
}

function read(req, res, next) {
  baseController.read(optionsRead)(req, res, next);
}

function update(req, res, next) {
  baseController.update(options)(req, res, next);
}

function destroy(req, res, next) {
  baseController.destroy(options)(req, res, next);
}

export default {
  getArtworks,
  getVotes,
  getQuestions,
  create,
  read,
  readAll,
  update,
  destroy,
};
