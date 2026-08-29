const catchAsync = require('./../utils/catchAsync');
const APIFeatures = require('./../utils/apiFeatures');

exports.createOne = fn = (Model) =>
  catchAsync(async (req, res, next) => {
    const newDoc = await Model.create(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        data: newDoc,
      },
    });
  });

exports.getAll = fn = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    const features = new APIFeatures(Model.find(), req.query)
      .filter()
      .sorting()
      .limitFields()
      .pagination();

    if (populateOptions) {
      if (Array.isArray(populateOptions)) {
        populateOptions.forEach((opt) => {
          features.query = features.query.populate(opt);
        });
      } else {
        features.query = features.query.populate(populateOptions);
      }
    }

    const docs = await features.query;

    // Derive a plural key name (basic heuristic)
    const modelName = Model.modelName || 'items';
    const key = `${modelName.toLowerCase()}s`;

    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: {
        [key]: docs,
      },
    });
  });

exports.getOne = fn = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (populateOptions) {
      if (Array.isArray(populateOptions)) {
        populateOptions.forEach((opt) => {
          query = query.populate(opt);
        });
      } else {
        query = query.populate(populateOptions);
      }
    }
    const doc = await query;
    res.status(200).json({
      status: 'success',
      data: {
        doc,
      },
    });
  });

exports.updateOne = fn = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // This option returns the modified document
      runValidators: false, // We can turn on validators later
    });
    res.status(200).json({
      status: 'success',
      data: {
        doc,
      },
    });
  });

exports.deleteOne = fs = (Model) =>
  catchAsync(async (req, res, next) => {
    await Model.findByIdAndDelete(req.params.id);
    res.status(204).json({
      // 204 means "No Content"
      status: 'success',
      data: null,
    });
  });
