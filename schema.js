const Joi = require('joi');

module.exports.blogSchema = Joi.object({
  blog: Joi.object({
    title: Joi.string().required(),
    headContent: Joi.string().required(),
    content: Joi.string().required(),
    image: Joi.string().allow(""),
    country: Joi.string().required(),
    author: Joi.string().required(),
    tags: Joi.alternatives().try(
      Joi.array().items(Joi.string()),
      Joi.string()
    )
  }).required(),
  newTag: Joi.string().allow("") // ✅ add this line
});

module.exports.reviewSchema = Joi.object({
    review: Joi.object({
        rating: Joi.number().required().min(1).max(5),
        comment: Joi.string().required(),
    }).required(),
});