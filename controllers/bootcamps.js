// Import custom errorResponse
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const geocoder = require('../utils/geocoder');

// Import Bootcamp model schema
const Bootcamp = require('../models/Bootcamp');
const { listenerCount } = require('../models/Bootcamp');

//  @desc:      Get all bootcamps
//  @route:     GET  /api/v1/bootcamps
//  @access:    Public
exports.getBootcamps = asyncHandler(async (req, res, next) => {
  // Add $ sign for mongo in order to use mongo find function
  let query;

  // copy req.query
  const reqQuery = { ...req.query };

  // field to exclude
  const removeField = ['select', 'sort', 'page', 'limit'];

  //loop over remove removeField and delete them from req reqQuery
  removeField.forEach((param) => delete reqQuery[param]);

  // create query string
  let queryStr = JSON.stringify(reqQuery);

  // create mongo  operators ($gt,$gte, etc)
  queryStr = queryStr.replace(
    /\b(gt|gte|lt|lte|in)\b/g,
    (match) => `$${match}`
  );

  // finding resorce
  query = Bootcamp.find(JSON.parse(queryStr));

  // select fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query.sort('-createdAt');
  }

  // pagination replace string to base 10 number or default will be page 1
  const page = parseInt(req.query.page, 10) || 1;
  // limit count for records from Mongo - replace string to base 10 number or default will be 100 records return
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  //get all ducuments from bootcamps
  const total = await Bootcamp.countDocuments();

  query = query.skip(startIndex).limit(limit);

  // Excuting out query
  const bootcamps = await query;

  // pagination result
  const pagination = {};
  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit,
    };
  }
  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit,
    };
  }

  res.status(200).json({
    success: true,
    count: bootcamps.length,
    pagination,
    data: bootcamps,
  });
});

//  @desc:      Get single bootcamps
//  @route:     GET  /api/v1/bootcamps/:id
//  @access:    Public
exports.getBootcamp = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findById(req.params.id);
  if (!bootcamp) {
    return next(
      new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
    );
  } else {
    res.status(200).json({
      success: true,
      data: bootcamp,
    });
  }
});

//  @desc:      Create new bootcamp
//  @route:     POST  /api/v1/bootcamps
//  @access:    Private
exports.createBootcamp = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.create(req.body);
  res.status(201).json({
    success: true,
    data: bootcamp,
  });
});

//  @desc:      Update bootcamp
//  @route:     PUT  /api/v1/bootcamps/:id
//  @access:    Private
exports.updateBootcamp = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!bootcamp) {
    return next(
      new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
    );
  } else {
    res.status(200).json({
      success: true,
      data: bootcamp,
    });
  }
});

//  @desc:      Delete bootcamp
//  @route:     DELETE  /api/v1/bootcamps/:id
//  @access:    Private
exports.deleteBootcamp = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findByIdAndDelete(req.params.id);
  if (!bootcamp) {
    return next(
      new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
    );
  } else {
    res.status(200).json({
      success: true,
      data: { msg: 'bootcamp deleted succesfully' },
    });
  }
});

//  @desc:      Get bootcamps within a radios
//  @route:     GET  /api/v1/bootcamps/radius/:zipcode/:distance
//  @access:    Private
exports.getBootcampsInRadius = asyncHandler(async (req, res, next) => {
  const { zipcode, distance } = req.params;

  // Get lat/lng from geocoder
  const loc = await geocoder.geocode(zipcode);
  const lat = loc[0].latitude;
  const lng = loc[0].longitude;

  // Calc radius using radians
  // Divide distance by radius of Earth
  // Earth Radius = 6,378 km
  const radius = distance / 6368;

  const bootcamps = await Bootcamp.find({
    location: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });
  res.status(200).json({
    success: true,
    count: bootcamps.length,
    data: bootcamps,
  });
});
