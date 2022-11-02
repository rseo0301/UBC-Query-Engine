import { expect } from "chai";
import * as chai from "chai";
import * as fs from "fs-extra";
import * as chaiAsPromised from "chai-as-promised";
import {InsightDataset, InsightDatasetKind, InsightError} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";
import {NotFoundError} from "restify";
import {QueryValidation} from "../src/controller/QueryValidation";

// This extends chai with assertions that natively support Promises
chai.use(chaiAsPromised);

describe("Validate query", function () {
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        smallSet: "test/data/mathCourses.zip",
        testSet: "test/data/testSet.zip",
    };
    let datasets: { [id: string]: string } = {};
    let queryValidation: QueryValidation;
    let insightFacade: InsightFacade;
    const cacheDir = __dirname + "/../data";
    let query0 = {
        WHERE: {
            OR: [
                {
                    AND: [
                        {
                            GT: {
                                courses_year: 2010
                            }
                        },
                        {
                            IS: {}
                        }
                    ]
                },
                {
                    EQ: {
                        courses_avg: 100
                    }
                }
            ]
        },
        OPTIONS: {
            COLUMNS: [
                "courses_dept",
                "courses_id",
                "courses_avg",
                "courses_instructor"
            ],
            ORDER: "courses_avg"
        }
    };

    let query12 = {
        WHERE: {
            IS: {
                courses_id: "210"
            }
        },
        OPTIONS: {
            COLUMNS: [
                "courses_dept",
                "courses_avg"
            ],
            ORDER: "courses_dept"
        }
    };

    let query13 = {
        WHERE: {
            GT: {
                courses_avg: 97
            }
        },
        OPTIONS: {
            COLUMNS: [
                "courses_dept"
            ],
            ORDER: "courses_dept"
        }
    };

    let query14 = {
        WHERE: {
            OR: [
                {
                    AND: [
                        {
                            GT: {}
                        },
                        {
                            IS: {
                                courses_instructor: "*morgan*"
                            }
                        }
                    ]
                },
                {
                    EQ: {
                        courses_avg: 100
                    }
                }
            ]
        },
        OPTIONS: {
            COLUMNS: [
                "courses_dept",
                "courses_id",
                "courses_avg",
                "courses_instructor"
            ],
            ORDER: "courses_avg"
        }
    };

    let queryWithC2Sort = {
        WHERE: {
            GT: {
                courses_avg: 97
            }
        },
        OPTIONS: {
            COLUMNS: [
                "courses_dept",
                "courses_avg"
            ],
            ORDER: {
                dir: "UP",
                keys: [
                    "courses_avg", "courses_dept"
                ]
            }
        }
    };

    let queryWithC2TransformationInvalid = {
        WHERE: {},
        OPTIONS: {
            COLUMNS: [
                "courses_title",
            ],
            ORDER: {
                dir: "UP",
                keys: [
                    "courses_title", "overallAvg"
                ]
            }
        },
        TRANSFORMATIONS: {
            GROUP: [
                "courses_title"
            ],
            APPLY: [
                {
                    overallAvg: {
                        AVG: "courses_avg"
                    }
                },
                {
                    overallFail: {
                        AVG: "courses_fail"
                    }
                }
            ]
        }
    };

    let queryWithC2TransformationValid = {
        WHERE: {},
        OPTIONS: {
            COLUMNS: [
                "courses_title",
                "LOL"
            ],
            ORDER: {
                dir: "UP",
                keys: [
                    "LOL"
                ]
            }
        },
        TRANSFORMATIONS: {
            GROUP: [
                "courses_title"
            ],
            APPLY: [
                {
                    LOL: {
                        AVG: "courses_avg"
                    }
                },
                {
                    overallFsdfsail: {
                        COUNT: "courses_uuid"
                    }
                }
            ]
        }
    };

    let queryWithC2Transformation = {
        WHERE: {},
        OPTIONS: {
            COLUMNS: [
                "courses_title",
                "overallFail"
            ]
        },
        TRANSFORMATIONS: {
            GROUP: [
                "courses_title"
            ],
            APPLY: [
                {
                    asddasd: {
                        COUNT: "courses_avg"
                    }
                },
                {
                    overallFail: {
                        AVG: "courses_fail"
                    }
                }
            ]
        }
    };

    before(function () {
        // This section runs once and loads all datasets specified in the datasetsToLoad object
        // into the datasets object
        Log.test(`Before all`);
        Log.test(`Before all`);
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir);
        }
        // for (const id of Object.keys(datasetsToLoad)) {
        //     datasets[id] = fs.readFileSync(datasetsToLoad[id]).toString("base64");
        // }
        try {
            queryValidation = new QueryValidation(["courses"]);
            // insightFacade = new InsightFacade();
            // insightFacade.addDataset("courses", datasets["testSet"], InsightDatasetKind.Courses);
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
    });

    it("Filter is invalid", function () {
        const futureResult: boolean = queryValidation.checkQueryValidity(query13);
        return expect(futureResult).to.equal(true);
    });

    it("Nested filter invalid", function () {
        const futureResult: boolean = queryValidation.checkQueryValidity(queryWithC2TransformationInvalid);
        return expect(futureResult).to.equal(false);
    });

    it("Query with valid transformation", function () {
        const futureResult: boolean = queryValidation.checkQueryValidity(queryWithC2Transformation);
        return expect(futureResult).to.equal(true);
    });

    it("Nested NOT", function () {
        const futureResult: boolean = queryValidation.checkQueryValidity(queryWithC2TransformationValid);
        return expect(futureResult).to.equal(true);
    });
});
