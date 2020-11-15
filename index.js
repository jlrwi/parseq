import parseq from "./parseq.js";
import requestor_type from "@jlrwi/requestor_type";
import {
    is_object,
    array_map
} from "@jlrwi/esfunctions";
import {
    object_dictionary_type
} from "@jlri/es-static-types";

/*
Parseq wrapper to curry the requestors
Also adds applied versions of parseq requestors
*/

const requestor = requestor_type ();
const obj_of_requestor = object_dictionary_type (requestor);

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

        return parseq.parallel(
            required_array,
            optional_array,
            time_limit,
            time_option,
            throttle
        );
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

        return parseq.parallel_object(
            required_object,
            optional_object,
            time_limit,
            time_option,
            throttle
        );
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

        return parseq.race(requestor_array, time_limit, throttle);
    };
};

const fallback = function (options = {}) {
    return function (requestor_array) {

        if (!is_object (options)) {
            throw "Invalid options object";
        }

        const {time_limit} = options;

        return parseq.race(requestor_array, time_limit, 1);
    };
};

const sequence = function (options = {}) {
    return function (requestor_array) {

        if (!is_object (options)) {
            throw "Invalid options object";
        }

        const {time_limit} = options;

        return parseq.parallel(
            requestor_array,
            undefined,
            time_limit,
            undefined,
            1,
            "sequence"
        );
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
            return function (final_callback) {
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
        return function (final_callback) {
            return function (input_object) {
                if (!is_object (input_object)) {
                    throw "Invalid options object";
                }

                const requestor_obj = obj_of_requestor.map (
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