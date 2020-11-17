/*jslint
    fudge, node
*/

import parseq from "./parseq.js";
import {
    is_object,
    array_map
} from "@jlrwi/esfunctions";
import {
    object_dictionary_type
} from "@jlrwi/es-static-types";

/*
Parseq wrapper to curry the requestors
Also adds applied versions of parseq requestors
*/

const dictionary = object_dictionary_type ();

const uncurried_requestor = function (requestor) {
    return function uncurried_requestor (callback, initial_value) {
        requestor (callback) (initial_value);
    };
};

const uncurry_requestors = function (requestor_list) {

    if (Array.isArray(requestor_list)) {
        return array_map (uncurried_requestor) (requestor_list);
    }

    if (is_object (requestor_list)) {
        return dictionary.map (uncurried_requestor) (requestor_list);
    }

    return requestor_list;
};

const parallel = function (options = {}) {
    return function (required_array, optional_array) {

        if (!is_object (options)) {
            throw "Invalid options object";
        }

        const {
            time_limit,
            time_option,
            throttle
        } = options;

        return function parallel_requestor (callback) {
            return function (initial_value) {
                parseq.parallel(
                    uncurry_requestors (required_array),
                    uncurry_requestors (optional_array),
                    time_limit,
                    time_option,
                    throttle
                ) (callback, initial_value);
            };
        };
    };
};

const parallel_object = function (options = {}) {
    return function (required_object, optional_object) {

        if (!is_object (options)) {
            throw "Invalid options object";
        }

        const {
            time_limit,
            time_option,
            throttle
        } = options;

        return function parallel_object_requestor (callback) {
            return function (initial_value) {
                parseq.parallel_object(
                    uncurry_requestors (required_object),
                    uncurry_requestors (optional_object),
                    time_limit,
                    time_option,
                    throttle
                ) (callback, initial_value);
            };
        };
    };
};

const race = function (options = {}) {
    return function (requestor_array) {

        if (!is_object (options)) {
            throw "Invalid options object";
        }

        const {
            time_limit,
            throttle
        } = options;

        return function parallel_requestor (callback) {
            return function (initial_value) {
                parseq.race(
                    uncurry_requestors (requestor_array),
                    time_limit,
                    throttle
                ) (callback, initial_value);
            };
        };
    };
};

const fallback = function (options = {}) {
    return function (requestor_array) {

        if (!is_object (options)) {
            throw "Invalid options object";
        }

        const {time_limit} = options;

        return function parallel_requestor (callback) {
            return function (initial_value) {
                parseq.fallback(
                    uncurry_requestors (requestor_array),
                    time_limit
                ) (callback, initial_value);
            };
        };
    };
};

const sequence = function (options = {}) {
    return function (requestor_array) {

        if (!is_object (options)) {
            throw "Invalid options object";
        }

        const {time_limit} = options;

        return function parallel_requestor (callback) {
            return function (initial_value) {
                parseq.sequence(
                    uncurry_requestors (requestor_array),
                    time_limit
                ) (callback, initial_value);
            };
        };
    };
};

const preloaded_requestor = function (requestor) {
    return function (input) {
        return function derived_requestor (callback) {
            return function (ignore) {
                requestor (callback) (input);
            };
        };
    };
};

// <a -> b> -> [a] -> [<a -> b>] -> [b]
const applied_requestor = function (processor) {
    return function (options = {}) {
        return function (requestor) {
            return function applied_requestor (final_callback) {
                return function (input_list) {

                    if (!Array.isArray (input_list)) {
                        throw "Input is not an array";
                    }

                    const requestor_list = array_map (
                        preloaded_requestor (requestor)
                    ) (
                        input_list
                    );

                    processor (options) (requestor_list) (final_callback) ();
                };
            };
        };
    };
};

const applied_race = applied_requestor (race);
const applied_parallel = applied_requestor (parallel);
const applied_fallback = applied_requestor (fallback);
const applied_sequence = applied_requestor (sequence);

// <a -> b> -> {a} -> [<a -> b>] -> {b}
const applied_parallel_object = function (options = {}) {
    return function (requestor) {
        return function applied_requestor (final_callback) {
            return function (input_object) {
                if (!is_object (input_object)) {
                    throw "Invalid options object";
                }

                const requestor_obj = dictionary.map (
                    preloaded_requestor (requestor)
                ) (
                    input_object
                );

                parallel_object (options) (requestor_obj) (final_callback) ();
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
    applied_sequence,
    applied_parallel_object
});