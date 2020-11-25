// Jonathan Reimer
// 2020-11-25

/*
This file is a wrapper for Parseq to curry the requestors and the factories.
New versions of parseq.js may be substituted as long as the factory parameters
remain unchanged.

It also adds applied versions of parseq requestors (except for sequence)
*/

/*jslint
    fudge
*/

import parseq from "./parseq.js";
import {
    is_object,
    array_map
} from "@jlrwi/esfunctions";

// copied from es-static-types to avoid circular dependency
const dictionary_map = function (f) {
    return function (obj) {
        let result = Object.create(null);
        Object.keys(obj).forEach(function (key) {
            result[key] = f(obj[key]);
        });
        return Object.freeze(result);
    };
};

// Take a curried requestor and allow it to be called in the original format
const uncurried_requestor = function (requestor) {
    return function uncurried_requestor(callback, initial_value) {
        return requestor(callback)(initial_value);
    };
};

// Take a list or object of curried requestors and un-curry them
const uncurry_requestors = function (requestor_list) {
    if (Array.isArray(requestor_list)) {
        return array_map(uncurried_requestor)(requestor_list);
    }

    if (is_object(requestor_list)) {
        return dictionary_map(uncurried_requestor)(requestor_list);
    }

    return requestor_list;
};

// Each original factory is curried to take first an options object,
// and then the array(s) of requestors
const parallel = function (options = {}) {
    return function (required_array, optional_array) {

        if (!is_object(options)) {
            throw "Invalid options object";
        }

        const {
            time_limit,
            time_option,
            throttle
        } = options;

        return function parallel_requestor(callback) {
            return function (initial_value) {
                return parseq.parallel(
                    uncurry_requestors(required_array),
                    uncurry_requestors(optional_array),
                    time_limit,
                    time_option,
                    throttle
                )(
                    callback,
                    initial_value
                );
            };
        };
    };
};

const parallel_object = function (options = {}) {
    return function (required_object, optional_object) {

        if (!is_object(options)) {
            throw "Invalid options object";
        }

        const {
            time_limit,
            time_option,
            throttle
        } = options;

        return function parallel_object_requestor(callback) {
            return function (initial_value) {
                return parseq.parallel_object(
                    uncurry_requestors(required_object),
                    uncurry_requestors(optional_object),
                    time_limit,
                    time_option,
                    throttle
                )(
                    callback,
                    initial_value
                );
            };
        };
    };
};

const race = function (options = {}) {
    return function (requestor_array) {

        if (!is_object(options)) {
            throw "Invalid options object";
        }

        const {
            time_limit,
            throttle
        } = options;

        return function race_requestor(callback) {
            return function (initial_value) {
                return parseq.race(
                    uncurry_requestors(requestor_array),
                    time_limit,
                    throttle
                )(
                    callback,
                    initial_value
                );
            };
        };
    };
};

const fallback = function (options = {}) {
    return function (requestor_array) {

        if (!is_object(options)) {
            throw "Invalid options object";
        }

        const {time_limit} = options;

        return function fallback_requestor(callback) {
            return function (initial_value) {
                return parseq.fallback(
                    uncurry_requestors(requestor_array),
                    time_limit
                )(
                    callback,
                    initial_value
                );
            };
        };
    };
};

const sequence = function (options = {}) {
    return function (requestor_array) {

        if (!is_object(options)) {
            throw "Invalid options object";
        }

        const {time_limit} = options;

        return function sequence_requestor(callback) {
            return function (initial_value) {
                return parseq.sequence(
                    uncurry_requestors(requestor_array),
                    time_limit
                )(
                    callback,
                    initial_value
                );
            };
        };
    };
};

// Take a requestor and input value, and return a requestor that takes a
// callback but ignores the normal initial_value parameter
const preloaded_requestor = function (requestor) {
    return function (input) {
        return function derived_requestor(callback) {
            return function (ignore) {
                return requestor(callback)(input);
            };
        };
    };
};

// Take one of the original (curried) factories and return the applied version
// Produces: <a -> b> -> [a] -> [<a -> b>] -> [b]
const applied_requestor = function (processor) {
    return function (options = {}) {
        return function (requestor) {
            return function applied_requestor(final_callback) {
                return function (input_list) {

                    if (!Array.isArray(input_list)) {
                        throw "Input is not an array";
                    }

                    const requestor_list = array_map(
                        preloaded_requestor(requestor)
                    )(
                        input_list
                    );

                    return processor(
                        options
                    )(
                        requestor_list
                    )(
                        final_callback
                    )(
                        0
                    );
                };
            };
        };
    };
};

const applied_race = applied_requestor(race);
const applied_parallel = applied_requestor(parallel);
const applied_fallback = applied_requestor(fallback);

// Produce the applied parallel object factory
// Result: <a -> b> -> {a} -> [<a -> b>] -> {b}
const applied_parallel_object = function (options = {}) {
    return function (requestor) {
        return function applied_requestor(final_callback) {
            return function (input_object) {

                if (!is_object(input_object)) {
                    throw "Invalid options object";
                }

                const requestor_obj = dictionary_map(
                    preloaded_requestor(requestor)
                )(
                    input_object
                );

                return parallel_object(
                    options
                )(
                    requestor_obj
                )(
                    final_callback
                )(
                    0
                );
            };
        };
    };
};

export default Object.freeze({
    fallback,
    parallel,
    parallel_object,
    race,
    sequence,
    applied_race,
    applied_parallel,
    applied_fallback,
    applied_parallel_object
});