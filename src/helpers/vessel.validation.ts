import Joi from "joi";

export const vesselValidationSchema = Joi.object({
  name: Joi.string().required().min(2).max(100),
  imo: Joi.string()
    .required()
    .pattern(/^[0-9]{7}$/),
  type: Joi.string().required().min(2).max(50),
  flag: Joi.string().required().min(2).max(50),
  buildYear: Joi.number()
    .required()
    .integer()
    .min(1800)
    .max(new Date().getFullYear()),
  grossTonnage: Joi.number().optional().allow(null).min(0),
});

export const vesselUpdateValidationSchema = Joi.object({
  name: Joi.string().optional().min(2).max(100),
  type: Joi.string().optional().min(2).max(50),
  flag: Joi.string().optional().min(2).max(50),
  buildYear: Joi.number()
    .optional()
    .integer()
    .min(1800)
    .max(new Date().getFullYear()),
  grossTonnage: Joi.number().optional().allow(null).min(0),
}).min(1); // Require at least one field to be present for updates
