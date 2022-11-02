import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
let mfield: string[] = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
let sfield: string[] = ["dept", "id", "instructor", "title", "uuid"
    , "fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
let coursesFields: string[] = ["avg", "pass", "fail", "audit", "year", "dept", "id", "instructor", "title", "uuid"];
let roomsFields: string[] = ["fullname", "shortname", "number", "name",
    "address", "type", "furniture", "href", "lat", "lon", "seats"];
let applyToken: string[] = ["MAX", "MIN", "AVG", "COUNT", "SUM"];
let numericTokens: string[] = ["MAX", "MIN", "AVG", "SUM"];
let applyKeyTest = new RegExp(/^[^_]+$/);
let allFields: string[] = mfield.concat(sfield);

export class TransformationValidator {
    private allRegularKeysInQuery: string[];
    private regularKeysInColumn: string[];
    private applyKeysInColumn: string[];
    private allKeysInColumn: string[];
    private allKeysInGroup: string[];
    private allKeysInApply: string[];

    constructor(allRegularKeys: any[], allColumnKeys: any[]) {
        this.allRegularKeysInQuery = allRegularKeys;
        this.regularKeysInColumn = [];
        this.applyKeysInColumn = [];
        this.allKeysInColumn = allColumnKeys;
        this.allKeysInGroup = [];
        this.allKeysInApply = [];
    }

    public checkTransformation(query: any) {
        let transformationKeys: string[] = Object.keys(query);
        if (transformationKeys[0] === "GROUP" && transformationKeys[1] === "APPLY") {
            return this.checkGroupValidity(query["GROUP"]) && this.checkApplyValidity(query["APPLY"]);
        } else {
            return false;
        }
    }

    private checkGroupValidity(queryElement: any) {
        if (queryElement === null || queryElement === undefined) {
            return false;
        }
        if (queryElement.length >= 1) {
            for (let key of queryElement) {
                // this.allRegularKeysInQuery.push(key);
                if (this.checkGroupKey(key) === false) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }

    private checkApplyValidity(applyRules: any) {
        if (applyRules === null || applyRules === undefined) {
            return false;
        }
        if (!Array.isArray(applyRules)) {
            return false;
        }
        for (let applyRule of applyRules) {
            if (applyRule === null || applyRule === undefined) {
                return false;
            }
            let applyKey: any = Object.keys(applyRule);
            if (applyKey.length > 1 || !applyKeyTest.test(applyKey[0])) {
                return false;
            }
            this.allKeysInApply.push(applyKey[0]);
            let token: any = Object.keys(applyRule[applyKey]);
            if (!applyToken.includes(token[0])) {
                return false;
            }
            if (!this.checkApplyKey(token[0], applyRule[applyKey][token])) {
                return false;
            }
        }
        return true;
    }

    private checkGroupKey(key: any) {
        if (typeof key === "string") {
            let splitKey: string[] = key.split("_");
            if (splitKey.length > 2 || splitKey.includes("")) {
                return false;
            } else if (splitKey.length === 2 && allFields.includes(splitKey[1])) {
                this.allKeysInGroup.push(key);
                this.allRegularKeysInQuery.push(key);
                return true;
            }
        }
        return false;
    }

    private checkApplyKey(token: any, key: any) {
        if (typeof key === "string") {
            let splitKey: string[] = key.split("_");
            if (splitKey.length !== 2 || splitKey.includes("")) {
                return false;
            }
            if (numericTokens.includes(token) && !(mfield.includes(splitKey[1]))) {
                return false;
            }
            if (!allFields.includes(splitKey[1])) {
                return false;
            }
            if (splitKey.length === 2) {
                // this.allKeysInApply.push(key);
                this.allRegularKeysInQuery.push(key);
                return true;
            } else {
                return false;
            }
        }
        return false;
    }

    public checkTransformKeys() {
        for (let key of this.allKeysInColumn) {
            if (!this.allKeysInApply.includes(key) && !this.allKeysInGroup.includes(key)) {
                return false;
            }
        }
        return true;
    }
}
