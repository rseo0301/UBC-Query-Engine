import * as chai from "chai";
import {expect} from "chai";
import * as fs from "fs-extra";
import * as chaiAsPromised from "chai-as-promised";
import {
    InsightDataset,
    InsightDatasetKind,
    InsightError,
    NotFoundError,
    ResultTooLargeError
} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";
// import {NotFoundError} from "../src/controller/IInsightFacade";

// This extends chai with assertions that natively support Promises
chai.use(chaiAsPromised);

// This should match the schema given to TestUtil.validate(..) in TestUtil.readTestQueries(..)
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any;  // make any to allow testing structurally invalid queries
    isQueryValid: boolean;
    result: any;
    filename: string;  // This is injected when reading the file
}

describe("InsightFacade Add/Remove/List Dataset", function () {
    this.timeout(100000);
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the 'before' hook.
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        txtFile: "test/data/test.txt",
        notCourse: "test/data/notCourses.zip",
        empty: "test/data/empty.zip",
        _: "test/data/_.zip",
        eqwe_ewwer: "test/data/eqwe_ewwer.zip",
        noSections: "test/data/noSections.zip",
        courses1: "test/data/courses1.zip",
        allInvalid: "test/data/allInvalid.zip",
        oneInvalidExpected: "test/data/1InvalidExpected.zip",
        smallSet: "test/data/mathCourses.zip",
        testSet: "test/data/testSet.zip",
        rooms: "test/data/rooms.zip"
    };
    let datasets: { [id: string]: string } = {};

    let query13 = {
        WHERE: {
            AND: [
                {
                    IS: {
                        rooms_uuid: "*Tables*"
                    }
                },
                {
                    GT: {
                        rooms_lat: 5
                    }
                }
            ]
        },
        OPTIONS: {
            COLUMNS: [
                "rooms_year",
                "maxSeats"
            ],
            ORDER: {
                dir: "DOWN",
                keys: [
                    "maxSeats"
                ]
            }
        },
        TRANSFORMATIONS: {
            GROUP: [
                "rooms_year"
            ],
            APPLY: [
                {
                    maxSeats: {
                        COUNT: "rooms_address"
                    }
                }
            ]
        }
    };

    let query14 = {
        WHERE: {
            IS: {
                courses_id: "323"
            }
        },
        OPTIONS: {
            COLUMNS: [
                "courses_dept",
                "courses_year",
                "courses_instructor"
            ],
            ORDER: "courses_dept"
        }
    };

    let insightFacade: InsightFacade;
    const cacheDir = __dirname + "/../data";

    before(function () {
        // This section runs once and loads all datasets specified in the datasetsToLoad object
        // into the datasets object
        Log.test(`Before all`);
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir);
        }
        for (const id of Object.keys(datasetsToLoad)) {
            datasets[id] = fs.readFileSync(datasetsToLoad[id]).toString("base64");
        }
        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        // This section resets the data directory (removing any cached data) and resets the InsightFacade instance
        // This runs after each test, which should make each test independent from the previous one
        Log.test(`AfterTest: ${this.currentTest.title}`);
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    // This is a unit test. You should create more like this!
    // Tests for addDataset
    it("Should add a valid dataset", function () {
        const id: string = "courses1";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("Test execute query", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        return insightFacade.addDataset("courses", datasets[id], InsightDatasetKind.Courses).then(() => {
            return insightFacade.performQuery(query14);
        }).then((result) => {
            // console.log(result);
        });
        // return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("Execute query blank result", function () {
        const id: string = "testSet";
        const expected: string[] = [id];
        return insightFacade.addDataset("courses", datasets[id], InsightDatasetKind.Courses).then(() => {
            let futureResult = insightFacade.performQuery(query14);
            return expect(futureResult).to.eventually.deep.equal([]);
        });
        // return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("Test execute query too large", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        return insightFacade.addDataset("courses", datasets[id], InsightDatasetKind.Courses).then(() => {
            return insightFacade.addDataset("rooms", datasets["rooms"], InsightDatasetKind.Rooms).then(() => {
                let futureResult = insightFacade.performQuery(query13);
                return expect(futureResult).to.be.rejectedWith(ResultTooLargeError);
            });
        });
        // return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("Adding valid dataset with undefined id", function () {
        const id: string = undefined;
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id, datasets[id], InsightDatasetKind.Courses
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Adding valid dataset with null id", function () {
        const id: string = null;
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id, datasets[id], InsightDatasetKind.Courses
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Adding valid dataset with blank id", function () {
        const id: string = " ";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id, datasets[id], InsightDatasetKind.Courses
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Adding valid dataset with 1 underscore as id", function () {
        const id: string = "_";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id, datasets[id], InsightDatasetKind.Courses
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Adding valid dataset with underscore in middle of id", function () {
        const id: string = "eqwe_ewwer";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id, datasets[id], InsightDatasetKind.Courses
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Adding valid dataset & id with rooms as kind", function () {
        const id: string = "courses";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id, datasets[id], InsightDatasetKind.Rooms
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Invalid dataset (txt file)", function () {
        const id: string = "txtFile";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id, datasets[id], InsightDatasetKind.Courses
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Invalid dataset (internal folder not called courses)", function () {
        const id: string = "notCourse";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id, datasets[id], InsightDatasetKind.Courses
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Invalid dataset (empty courses folder)", function () {
        const id: string = "empty";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id, datasets[id], InsightDatasetKind.Courses
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Invalid dataset (no course sections)", function () {
        const id: string = "noSections";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id, datasets[id], InsightDatasetKind.Courses
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Invalid dataset (all files are non JSON)", function () {
        const id: string = "allInvalid";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id, datasets[id], InsightDatasetKind.Courses
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Adding same dataset twice (reject)", function () {
        const id: string = "courses";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then(() => {
            const futureResult: Promise<string[]> = insightFacade.addDataset(
                id, datasets[id], InsightDatasetKind.Courses);
            return expect(futureResult).to.be.rejectedWith(InsightError);
        });
    });

    it("Adding 2 different datasets (accept)", function () {
        const id1: string = "courses";
        const id2: string = "courses1";
        const expected: string[] = [id1];
        const finalExpected: string[] = [id1, id2];
        let futureResult: Promise<string[]> = insightFacade.addDataset(
            id1, datasets[id1], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
            futureResult = insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses);
            return expect(futureResult).to.eventually.deep.equal(finalExpected);
        });
    });

    it("Adding 1 valid and then 1 invalid dataset (accept then reject)", function () {
        const id1: string = "courses";
        const id2: string = "txtFile";
        const expected: string[] = [id1];
        let futureResult: Promise<string[]> = insightFacade.addDataset(
            id1, datasets[id1], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
            futureResult = insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses);
            return expect(futureResult).to.be.rejectedWith(InsightError);
        });
    });

    it("Adding 1 valid and then invalid id (accept then reject)", function () {
        const id1: string = "courses";
        const id2: string = "_";
        const expected: string[] = [id1];
        let futureResult: Promise<string[]> = insightFacade.addDataset(
            id1, datasets[id1], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
            futureResult = insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses);
            return expect(futureResult).to.be.rejectedWith(InsightError);
        });
    });

    it("Adding 1 valid and then undefined id (accept then reject)", function () {
        const id1: string = "courses";
        const id2: string = undefined;
        const expected: string[] = [id1];
        let futureResult: Promise<string[]> = insightFacade.addDataset(
            id1, datasets[id1], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
            futureResult = insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses);
            return expect(futureResult).to.be.rejectedWith(InsightError);
        });
    });

    it("Adding 1 valid and then null id (accept then reject)", function () {
        const id1: string = "courses";
        const id2: string = null;
        const expected: string[] = [id1];
        let futureResult: Promise<string[]> = insightFacade.addDataset(
            id1, datasets[id1], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
            futureResult = insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses);
            return expect(futureResult).to.be.rejectedWith(InsightError);
        });
    });

    it("Valid dataset (1 invalid file)", function () {
        const id: string = "oneInvalidExpected";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id, datasets[id], InsightDatasetKind.Courses
        );
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    // Tests for removeDataset
    it("Valid remove (1 dataset added)", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id, datasets[id], InsightDatasetKind.Courses
        );
        return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
            const removeResult: Promise<string> = insightFacade.removeDataset(id);
            return expect(removeResult).to.eventually.deep.equal(id);
        });
    });

    it("Valid remove (2 datasets added)", function () {
        const id1: string = "courses";
        const id2: string = "courses1";
        const expected: string[] = [id1];
        const finalExpected: string[] = [id1, id2];
        let futureResult: Promise<string[]> = insightFacade.addDataset(
            id1, datasets[id1], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
            futureResult = insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses);
            return expect(futureResult).to.eventually.deep.equal(finalExpected).then(() => {
                const removeResult: Promise<string> = insightFacade.removeDataset(id1);
                return expect(removeResult).to.eventually.deep.equal(id1);
            });
        });
    });

    // Id is invalid: whitespaces
    it("Can't remove an empty ID", function () {
        const id: string = "   ";
        const futureResult: Promise<string> = insightFacade.removeDataset(id);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });
    // Id is invalid: underscores
    it("Can't remove invalid ID, check for underscores", function () {
        const id: string = "invalid_id";
        const futureResult: Promise<string> = insightFacade.removeDataset(id);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Invalid remove (valid id not added)", function () {
        const id: string = "courses";
        const futureResult: Promise<string> = insightFacade.removeDataset(id);
        return expect(futureResult).to.be.rejectedWith(NotFoundError);
    });

    it("Invalid remove (undefined id)", function () {
        const id1: string = undefined;
        const futureResult: Promise<string> = insightFacade.removeDataset(id1);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Invalid remove (null id)", function () {
        const id1: string = null;
        const futureResult: Promise<string> = insightFacade.removeDataset(id1);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Invalid remove (blank space id)", function () {
        const id1: string = "  ";
        const futureResult: Promise<string> = insightFacade.removeDataset(id1);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Invalid remove (id with underscore)", function () {
        const id1: string = "test_id";
        const futureResult: Promise<string> = insightFacade.removeDataset(id1);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Valid double remove", function () {
        const id1: string = "courses";
        const id2: string = "courses1";
        return insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Courses).then(() => {
            return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses).then(() => {
                let removeResult: Promise<string> = insightFacade.removeDataset(id1);
                return expect(removeResult).to.eventually.deep.equal(id1).then(() => {
                    removeResult = insightFacade.removeDataset(id2);
                    return expect(removeResult).to.eventually.deep.equal(id2);
                });
            }).catch(() => {
                expect.fail("Add dataset should not have failed");
            });
        }).catch(() => {
            expect.fail("Add dataset should not have failed");
        });
    });

    // Tests for listDataset
    it("List empty list", function () {
        const expected: InsightDataset[] = [];
        const futureResult: Promise<InsightDataset[]> = insightFacade.listDatasets();
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("List added dataset", function () {
        const id: string = "courses";
        // Number of rows from piazza post 171
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then(() => {
            return insightFacade.listDatasets().then((futureResult: InsightDataset[]) => {
                expect(futureResult[0].id).to.deep.equal("courses");
                expect(futureResult[0].kind).to.deep.equal(InsightDatasetKind.Courses);
                expect(futureResult[0].numRows).to.deep.equal(64612);
            });
        });
    });

    // it("Add, delete then list a dataset", function () {
    //     const id: string = "courses";
    //     const expected: InsightDataset[] = [];
    //     return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then(() => {
    //         return insightFacade.removeDataset(id).then(() => {
    //             const futureResult: Promise<InsightDataset[]> = insightFacade.listDatasets();
    //             return expect(futureResult).to.eventually.deep.equal(expected);
    //         }).catch(() => {
    //             expect.fail("Remove dataset should not have failed");
    //         });
    //     }).catch(() => {
    //         expect.fail("Add dataset should not have failed");
    //     });
    // });

    it("List after notFoundError from remove", function () {
        const id: string = "courses";
        const expected: InsightDataset[] = [];
        const futureResult: Promise<string> = insightFacade.removeDataset(id);
        return expect(futureResult).to.be.rejectedWith(NotFoundError).then(() => {
            const result: Promise<InsightDataset[]> = insightFacade.listDatasets();
            return expect(result).to.eventually.deep.equal(expected);
        });
    });

    it("List after insightError from remove", function () {
        const id: string = "_";
        const expected: InsightDataset[] = [];
        const futureResult: Promise<string> = insightFacade.removeDataset(id);
        return expect(futureResult).to.be.rejectedWith(InsightError).then(() => {
            const result: Promise<InsightDataset[]> = insightFacade.listDatasets();
            return expect(result).to.eventually.deep.equal(expected);
        });
    });

    it("List after insightError from add", function () {
        const id: string = "txtFile";
        const expected: InsightDataset[] = [];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id, datasets[id], InsightDatasetKind.Courses
        );
        return expect(futureResult).to.be.rejectedWith(InsightError).then(() => {
            const result: Promise<InsightDataset[]> = insightFacade.listDatasets();
            return expect(result).to.eventually.deep.equal(expected);
        });
    });

    it("addRoomDataset Test", function () {
        const id: string = "rooms";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        return expect(futureResult).to.eventually.deep.equal(expected);
    });
});

/*
 * This test suite dynamically generates tests from the JSON files in test/queries.
 * You should not need to modify it; instead, add additional files to the queries directory.
 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
 */
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: { [id: string]: {path: string, kind: InsightDatasetKind} } = {
        courses: {path: "./test/data/courses.zip", kind: InsightDatasetKind.Courses},
        // mathCourses: {path: "./test/data/testSet.zip", kind: InsightDatasetKind.Courses},
        rooms: {path: "./test/data/rooms.zip", kind: InsightDatasetKind.Rooms}
    };
    let insightFacade: InsightFacade;
    let testQueries: ITestQuery[] = [];

    // Load all the test queries, and call addDataset on the insightFacade instance for all the datasets
    before(function () {
        this.timeout(100000);
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = TestUtil.readTestQueries();
        } catch (err) {
            expect.fail("", "", `Failed to read one or more test queries. ${err}`);
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Will fail* if there is a problem reading ANY dataset.
        const loadDatasetPromises: Array<Promise<string[]>> = [];
        insightFacade = new InsightFacade();
        for (const id of Object.keys(datasetsToQuery)) {
            const ds = datasetsToQuery[id];
            const data = fs.readFileSync(ds.path).toString("base64");
            loadDatasetPromises.push(insightFacade.addDataset(id, data, ds.kind));
        }
        return Promise.all(loadDatasetPromises);
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Dynamically create and run a test for each query in testQueries
    // Creates an extra "test" called "Should run test queries" as a byproduct. Don't worry about it
    it("Should run test queries", function () {
        describe("Dynamic InsightFacade PerformQuery tests", function () {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, function () {
                    const futureResult: Promise<any[]> = insightFacade.performQuery(test.query);
                    return TestUtil.verifyQueryResult(futureResult, test);
                });
            }
        });
    });
});
