/**
 * 원앱통합 공통
 * 최종수정일시 : 2025.04.07 12:00
 */
"use strict";
window.ih = {};
ih = (function () {
  var self = {
    ver: "",
    env: { deviceType: null, os: null, platform: null, pageId: null },
    request: { count: 0 },
    isLoad: false,
    isInit: false,
    load: function () {
      if (this.isLoad) return;
      this.isLoad = true;
      this.debug("load ih");

      this.env.deviceType = "PC"; //PC
      var ua = window.navigator.userAgent;
      if (/sfmiapp/.test(ua)) {
        this.env.deviceType = "MA"; //모바일앱
      } else if (/mblSappYn=Y/.test(ua)) {
        this.env.deviceType = "MN"; //모니모앱
      } else if (
        /Mobile|Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/.test(
          ua
        )
      ) {
        this.env.deviceType = "MW"; //모바일웹
      }
      if (
        this.env.deviceType == "MA" ||
        this.env.deviceType == "MN" ||
        this.env.deviceType == "MW"
      ) {
        this.env.os = "Android";
        if (/mblOsDvC=02|iPhone|iPad|iPod|iOS/.test(ua)) {
          this.env.os = "iOS";
        }
      }
      /**
       * 모니모앱, 화재앱
       */
      try {
        if (window.webkit && window.webkit.messageHandlers) {
          if (
            window.webkit.messageHandlers.PFMAppInterface ||
            window.webkit.messageHandlers.MonimoAppInterface
          ) {
            this.env.deviceType = "MN"; //모니모앱
            this.env.os = "iOS";
          } else if (window.webkit.messageHandlers.getAppUserInfo) {
            this.env.deviceType = "MA"; //모니모앱
            this.env.os = "iOS";
          }
        } else {
          if (window.PFMAppInterface || window.MonimoAppInterface) {
            this.env.deviceType = "MN"; //모니모앱
            this.env.os = "Android";
          } else if (window.samsung && window.samsung.getAppUserInfo) {
            this.env.deviceType = "MA"; //모바일앱
            this.env.os = "Android";
          }
        }

        if (window.navigator.platform) {
          this.env.platform = window.navigator.platform;
        }
      } catch (e) {}

      this.env.pageId = this.getPageId();
    },
    init: function (opts) {
      opts = opts || {};
      if (this.isInit) {
        if (opts.callback) opts.callback();
        return;
      }
      this.isInit = true;
      if (
        window._ihPage &&
        (window._ihPage.certYN == "Y" || window._ihPage.e2eYN == "Y")
      ) {
        opts.e2e = true;
        if (window._ihPage.certYN == "Y") {
          opts.device = true;
        }
      }
      if (opts.e2e === true) {
        ih.request.count++;
        if ($plugins.uiLoading && $plugins.uiLoading.ing === 0) {
          ih.ui.loading(true);
        }
        ih.loadE2EModule(opts, function () {
          ih.request.count--;
          if (ih.request.count <= 0) {
            ih.ui.loading(false);
          }
          if (opts.callback) opts.callback();
        });
      } else {
        if (opts.callback) opts.callback();
      }
    },
    debug: function (message, data) {
      var debugMsg = "[IH] " + message;
      if (data != undefined) {
        console.log(debugMsg, data);
      } else {
        console.log(debugMsg);
      }
    },
    getStage: function () {
      if (window._ihPage && _ihPage.stage) {
        return _ihPage.stage;
      }
      var stage = "P";
      var hostname = location.hostname;
      if (!ih.util.isEmpty(hostname)) {
        if (hostname.indexOf("local") == 0) {
          stage = "L";
        } else if (hostname.indexOf("devmall") == 0) {
          stage = "D";
        } else if (hostname.indexOf("home") == 0) {
          stage = "Q";
        }
      }
      return stage;
    },
    getPageId: function () {
      var pageId = null;
      var url = document.URL;
      var endIdx = url.indexOf(".do");
      var stIdx = url.lastIndexOf("/", endIdx);
      if (endIdx > stIdx) {
        pageId = url.substring(stIdx + 1, endIdx);
      }
      return pageId;
    },
    loadE2EModule: function (opts, callback) {
      if (ih.env.deviceType == "PC") {
        ih.installCheckNOS(function () {
          ih.startNOS(opts, callback);
        });
      } else {
        ih.startNOS(opts, callback);
      }
    },
    /**
     * 보안키보드/키패드 값 설정
     */
    setE2EKaypadData: function (e2eForm, param) {
      param = param || {};
      if (!ih.util.isEmpty(e2eForm)) {
        var e2eItems = e2eForm.querySelectorAll(
          ".nppfs-elements input[type=hidden]"
        );
        if (e2eItems && e2eItems.length > 0) {
          for (var i = 0; i < e2eItems.length; i++) {
            param[e2eItems[i].name] = e2eItems[i].value;
          }
        }
      }
      return param;
    },
    /**
     * 단말정보 값 설정
     */
    setE2EDeviceData: function (param) {
      param = param || {};
      try {
        var deviceForm = document._e2e_device_form;
        if (deviceForm) {
          var deviceItems = deviceForm.querySelectorAll("[name^=f_]") || [];
          if (deviceItems && deviceItems.length > 0) {
            for (var i = 0; i < deviceItems.length; i++) {
              param[deviceItems[i].name] = deviceItems[i].value;
            }
          }
        }
      } catch (e) {}
      return param;
    },
    sendRequest: function (tranId, data, opts) {
      return ih._sendRequest(tranId, data, opts);
    },
    sendMultipartRequest: function (tranId, formData, opts) {
      opts = opts || {};
      opts.isMultipart = true;
      return ih._sendRequest(tranId, formData, opts);
    },
    _sendRequest: function (tranId, data, opts) {
      opts = opts || {};
      opts.data = data;
      opts.tranId = tranId;
      var deferred = $.Deferred();

      //			var opts = {};
      //			opts.tranId = tranId;
      opts.eventId =
        !ih.util.isEmpty(opts) &&
        (opts.eventId
          ? opts.eventId
          : (window._ihPage && _ihPage.screenId != undefined
              ? _ihPage.screenId
              : ih.env.pageId) +
            "_" +
            tranId); /* default eventId : 화면ID_트랜ID */
      opts.loading =
        !ih.util.isEmpty(opts) && opts.loading === false ? false : true;
      opts.perflog =
        !ih.util.isEmpty(opts) && opts.sfmilog === false ? false : true;
      opts.error =
        !ih.util.isEmpty(opts) && opts.error === false ? false : true;

      var url = "/vh/data/" + tranId + ".do";
      var header = { tranId: tranId };
      try {
        if (opts.perflog === true && window.sfmijs) {
          if (sfmijs.performance && sfmijs.performance.startBizEventPerfChk) {
            var pageId = ih.env.pageId;
            if (!ih.util.isEmpty(opts.eventId)) {
              var deviceType = "PC";
              if (ih.env.deviceType == "MN") {
                deviceType = "Monimo";
              } else {
                var ua = navigator.userAgent.toLowerCase();
                var deviceList = [
                  "android",
                  "iphone",
                  "ipod",
                  "ipad",
                  "blackberry",
                  "windows ce",
                  "samsung",
                  "lg",
                  "mot",
                  "sonyericsson",
                  "nokia",
                  "opeara mini",
                  "opera mobi",
                  "webos",
                  "iemobile",
                  "kfapwi",
                  "rim",
                  "bb10",
                  "ubuntu",
                ];
                for (var i = 0; i < deviceList.length; i++) {
                  if (ua.indexOf(deviceList[i]) > -1) {
                    deviceType = deviceList[i];
                    break;
                  }
                }
              }
              var deviceInfo = {
                modelNumber: deviceType,
                osName: "",
                osVersion: "",
                appName: "",
                appVersion: "",
                browserVersion: "",
                telecomAgency: "",
                networkType: deviceType == "PC" ? "LAN" : "LTE",
              };
              sfmijs.performance.startBizEventPerfChk(opts.eventId, pageId);
              header = sfmijs.makeRequestHeader(
                opts.tranId,
                pageId,
                deviceInfo
              );
            } else {
              opts.perflog = false;
            }
          }
        }
      } catch (e) {
        opts.perflog = false;
      }

      var ajaxContentType = "application/x-www-form-urlencoded;charset=UTF-8";
      var ajaxProcessData = true;
      var ajaxTimeout = 60 * 1000; // 60초
      var param = null;

      if (!ih.util.isEmpty(opts.timeout)) {
        ajaxTimeout = opts.timeout * 1000;
      }

      if (opts.isMultipart === true) {
        ajaxContentType = false;
        ajaxProcessData = false;
        if (!ih.util.isEmpty(data) && data instanceof FormData) {
          param = data;
          param.append("header", encodeURIComponent(JSON.stringify(header)));
        }
      } else {
        param = "header=" + encodeURIComponent(JSON.stringify(header));
        if (!ih.util.isEmpty(data)) {
          param = param + "&body=" + encodeURIComponent(JSON.stringify(data));
        }
      }

      opts.tranStartTime = new Date();
      if (opts.perflog === true && window.sfmijs) {
        try {
          sfmijs.startPref();
        } catch (e) {}
      }

      // 로딩바 show
      if (opts.loading) {
        if ($plugins.uiLoading && $plugins.uiLoading.ing === 0) {
          ih.ui.loading(true);
        }
        ih.request.count++;
      }
      var xhr = $.ajax({
        url: url,
        data: param,
        type: "POST",
        dataType: "json",
        contentType: ajaxContentType,
        processData: ajaxProcessData,
        global: false,
        timeout: ajaxTimeout,
        beforeSend: function (req) {
          if (ih.log) {
            ih.log.beforeSend(req, opts);
          }
          // 정보동의 공통 처리를 위해 요청헤더에 pageNumber값 추가
          var pageNumber =
            window._ihPage && _ihPage.pageNumber ? _ihPage.pageNumber : "";
          if (pageNumber) {
            req.setRequestHeader("pagenumber", pageNumber);
          }

          req.setRequestHeader("ssf-chnl", ih.env.deviceType);
          if (
            ih.env.deviceType == "MN" ||
            ih.env.deviceType == "MA" ||
            ih.env.deviceType == "MW"
          ) {
            if (ih.env.os == "iOS") {
              req.setRequestHeader("ssf-device", "IO");
            } else {
              req.setRequestHeader("ssf-device", "AO");
            }
          } else {
            req.setRequestHeader("ssf-device", "PC");
          }
          if (ih.env.platform) {
            req.setRequestHeader("ssf-platform", ih.env.platform);
          }
        },
        success: function (response, status, responseObj) {
          if (opts.perflog === true && window.sfmijs) {
            try {
              sfmijs.finishPref(
                opts.tranId,
                responseObj,
                "Y",
                opts.tranStartTime,
                new Date()
              );
            } catch (e) {}
          }
          var body = null;
          if (response && response.responseMessage) {
            if (!ih.util.isEmpty(response.responseMessage.body)) {
              body = response.responseMessage.body;
            }
            if (response.responseMessage.header) {
              if (response.responseMessage.header.errorMsg) {
                var errorObj = {
                  _isReject: true,
                  code: response.responseMessage.header.errorMsg.errorCode,
                  message: response.responseMessage.header.errorMsg.displayMsg,
                };

                if (
                  errorObj.code == "BIHAU00001" ||
                  errorObj.code == "BIHAU00002" ||
                  errorObj.code == "BIHAU00003"
                ) {
                  // BIHAU00001(로그인 세션이 없습니다.), BIHAU00002(접근 권한이 없습니다.), BIHAU00003(중복로그인)
                  if (ih.exit && ih.exit == "Y") {
                    return;
                  }
                  // index 페이지 또는 로그인 페이지로 이동
                  ih.exit = "Y";
                  ih.ui.loading(false);
                  ih.ui.alert(errorObj.message, function () {
                    //deferred.reject(errorObj);
                    if (
                      ih.env.deviceType != "MN" &&
                      errorObj.code == "BIHAU00003"
                    ) {
                      location.href = "/vh/page/VH.HPLO0002.do?cls=D";
                    } else {
                      ih.ui.goHome();
                    }
                  });
                } else {
                  if (opts.error === true) {
                    ih.ui.alert(errorObj.message, function () {
                      deferred.reject(errorObj);
                    });
                  } else {
                    deferred.reject(errorObj);
                  }
                }
                return;
              }
            }
            deferred.resolve(body);
          }
        },
        error: function (request, status, error) {
          if (opts.perflog === true && window.sfmijs) {
            try {
              sfmijs.cancelPref();
            } catch (e) {}
          }
          var errorObj = {
            _isReject: true,
            code: status,
            message: "서비스 요청 실패",
          };

          try {
            Object.assign(errorObj, {
              status: request.status,
              error: error,
              readyState: request.readyState,
            });
          } catch (e) {}

          if (opts.error === true && "abort" !== error) {
            ih.ui.alert(errorObj.message, function () {
              deferred.reject(errorObj);
            });
          } else {
            deferred.reject(errorObj);
          }
          return;
        },
        complete: function () {
          if (opts.loading) {
            ih.request.count--;
            // 로딩바 숨김
            if (ih.request.count <= 0) {
              ih.ui.loading(false);
            }
          }
        },
      });

      // 요청 중지 기능 추가
      deferred.abort = function () {
        if ("pending" === deferred.state()) {
          try {
            var a = xhr.abort();
            ih.debug(tranId + " 요청을 취소합니다.", xhr);
          } catch (e) {}
        }
      };

      return deferred;
    },
    startNOS: function (opts, startNOSCallback) {
      opts = opts || {};
      if (window.npPfsCtrl && npPfsCtrl.IsSupport()) {
        if (npPfsCtrl.isStartup === true) {
          return;
        }
        var firewall = false;
        var secureKey = false;
        var keypad = true;
        var device = opts.device === false ? false : true;
        var deviceForm = null;
        if (ih.env.deviceType == "PC" && ih.env.nosInstall === true) {
          firewall = true;
          secureKey = true;
        }
        if (device === true) {
          deviceForm = document.getElementById("_e2e_device_form");
          if (deviceForm == null || deviceForm == undefined) {
            deviceForm = document.createElement("form");
            deviceForm.id = "_e2e_device_form";
            deviceForm.name = "_e2e_device_form";
            document.getElementsByTagName("body")[0].appendChild(deviceForm);
          }
        }

        ih.setKeypadTheme(null);

        if (secureKey) {
          npPfsCtrl.setColor({
            TextColor: "", // 키보드보안 글자 색상
            FieldBgColor: "", // 키보드보안 배경 색상
            ReTextColor: "", // 키보드보안 치환 글자 색상
            ReFieldBgColor: "", // 키보드보안 치환 배경 색상
            OnTextColor: "", // 마우스입력기 포커스 글자 색상
            OnFieldBgColor: "", // 마우스입력기 포커스 배경 색상
            OffTextColor: "", // 마우스입력기 글자 색상
            OffFieldBgColor: "", // 마우스입력기 배경 색상
          });
        }

        ih.debug(
          "Nos npPfsStartupV2 [firewall:" +
            firewall +
            ",secureKey:" +
            secureKey +
            ",keypad:" +
            keypad +
            ",device:" +
            device +
            "]"
        );
        npPfsStartupV2(
          deviceForm,
          [firewall, secureKey, false, keypad, false, device],
          "npkencrypt",
          "on"
        );
        nq(document).on("nppfs-npv-after-hide", function (e) {
          if (e != null && e.target != null) {
            if (e.target.getAttribute("npkencrypt") == "on") {
              e.target.dispatchEvent(new CustomEvent("input"));
            }
          }
        });

        if (secureKey === true) {
          nq(document).on("nppfs-npk-focusout", function (e) {
            if (e != null && e.target != null) {
              if (e.target.getAttribute("npkencrypt") == "on") {
                e.target.dispatchEvent(new CustomEvent("input"));
              }
            }
          });
        }

        window.npPfsExtension = new (function () {
          if (secureKey === true) {
            this.startupCallback = function () {
              if (startNOSCallback) startNOSCallback();
            };
          }

          this.keyValidation = function (element, keyCode) {
            var dataType = element.getAttribute("data-type");
            if (dataType == "n" || dataType == "N") {
              if (keyCode < 48 || keyCode > 57) {
                return false;
              }
            }
            return true;
          };

          this.formatter = function ($element, isInput) {
            var str = $element.val();
            var type = $element.attr("nppfs-formatter-type");
            if ("creditcard" === type) {
              if (isInput) {
                if (str.length > 8) {
                  str = str.substring(0, str.length - 1) + "*";
                }
                if (str.length <= 8) {
                  return str
                    .replace(/-/g, "")
                    .replace(/([\d*]{4})([\d*]{1,4})/g, "$1-$2");
                } else if (str.length <= 12) {
                  return str
                    .replace(/-/g, "")
                    .replace(/([\d*]{4})([\d*]{4})([\d*]{1,4})/g, "$1-$2-$3");
                } else if (str.length > 12) {
                  return str
                    .replace(/-/g, "")
                    .replace(
                      /([\d*]{4})([\d*]{4})([\d*]{4})([\d*]{1,4})/g,
                      "$1-$2-$3-$4"
                    );
                }
              } else {
                return str.replace(/[^\d*]+/g, "");
              }
            }
            return str;
          };
        })();
      }
      if (secureKey !== true) {
        if (startNOSCallback) startNOSCallback();
      }
    },
    rescanNOS: function (eleId) {
      if (!ih.util.isEmpty(eleId)) {
        if (
          document.querySelectorAll("#" + eleId + " input[npkencrypt=on]")
            .length <= 0
        ) {
          return;
        }
      }
      ih.setKeypadTheme(eleId);
      if (window.npPfsCtrl && npPfsCtrl.IsSupport()) {
        if (npPfsCtrl.isStartup === true) {
          npPfsCtrl.RescanField();
        }
      }
    },
    setKeypadTheme: function (eleId) {
      var elements = null;
      if (!ih.util.isEmpty(eleId)) {
        elements = document.querySelectorAll(
          "#" + eleId + " input[npkencrypt=on]"
        );
      } else {
        elements = document.querySelectorAll("input[npkencrypt=on]");
      }
      if (elements && elements.length > 0) {
        elements.forEach(function (elem) {
          if (ih.env.deviceType == "PC") {
            elem.setAttribute("data-keypad-theme", "default");
          } else {
            elem.setAttribute("data-keypad-theme", "mobile");
            elem.removeAttribute("readonly");
          }
          if (
            elem.getAttribute("nppfs-formatter-type") != null &&
            elem.getAttribute("data-keypad-next") != null
          ) {
            elem.removeAttribute("data-keypad-next");
          }
        });
      }
    },
    installCheckNOS: function (installCheckNOSCallback) {
      if (
        !ih.util.isEmpty(ih.env.platform) &&
        !/win16|win32|win64|windows/.test(ih.env.platform.toLowerCase())
      ) {
        if (installCheckNOSCallback) {
          installCheckNOSCallback();
        }
        return;
      }
      ih.env.nosInstall = false;
      if (window.npPfsCtrl && npPfsCtrl.IsSupport()) {
        npPfsCtrl.isInstall({
          success: function () {
            ih.env.nosInstall = true;
            if (installCheckNOSCallback) installCheckNOSCallback();
          },
          fail: function () {
            ih.env.nosInstall = false;
            ih.ui.loading(false);
            ih.ui.alert("보안프로그램 설치 후 진행해 주세요.", function () {
              location.href = "/vh/page/VH.HPCTB002.do";
            });
          },
        });
      }
    },
    /**
     * 관리되는 네트워크 요청을 수행한다. (해당 함수를 통해 수행된 네트워크 요청은 추후 중지할 수 있도록 관리됨)
     *
     * @param tranId
     *            트랜ID
     * @param data
     *            페이로드 데이터 Object
     * @param opts
     *            옵션값
     *
     */
    sendManagedRequest: function (tranId, data, opts) {
      var deferred = $.Deferred();
      var req = ih._sendRequest(tranId, data, opts);
      req
        .then(
          function (result) {
            internal.managedRequest = internal.managedRequest.filter(function (
              obj
            ) {
              return obj !== req;
            });
            deferred.resolve(result);
          }.bind(this)
        )
        .catch(
          function (result) {
            internal.managedRequest = internal.managedRequest.filter(function (
              obj
            ) {
              return obj !== req;
            });
            deferred.reject(result);
          }.bind(this)
        );
      internal.managedRequest.push(req);
      return deferred;
    },

    /**
     * 관리되는 모든 네트워크 요청을 중지한다. (관리되는 네트워크 요청 중 현재 Pending 상태인 요청을 모두 중지함)
     */
    abortManagedRequest: function () {
      var copy = internal.managedRequest;
      internal.managedRequest = [];
      copy.forEach(function (req, idx) {
        try {
          req.abort();
        } catch (e) {}
      });
    },

    /**
     * 파일 다운로드
     *
     * @param tranId 페이지 트랜 ID 또는 url 주소 (화재 도메인이 아닌경우 전체 URL 경로 입력해야함)
     * @param data 데이터
     * @param option 옵션 {callback, filename}
     */
    fileDownload: function (tranId, data, option) {
      var url = ih.getTranUrl(tranId);
      var params = ih.util.objectToUrlParams(data);
      url +=
        (url.indexOf("?") >= 0 ? "&" : "?") +
        "_v=" +
        ih.ui.getResourceVersion() +
        (params ? "&" + params : "");
      option = option || {};

      if (ih.env.deviceType === "MN" || ih.env.deviceType === "MA") {
        ih.native.fileDownload(url, option.callback, option.filename);
      } else {
        window.location.href = url;
      }
    },

    /**
     * 다이렉트 도메인 정보
     *
     * @return 다이렉트 도메인 주소 리턴(20250507 보안취약점 조치)
     */
    getDirectDomain: function () {
      var directDomain = "";
      directDomain = "https://direct.samsungfire.com";
      return directDomain;
    },

    /**
     * 모니모 도메인 정보
     *
     * @return 스테이지에 따른 모니모 도메인 주소 리턴(20250513 보안취약점 조치)
     */
    getMonimoDomain: function () {
      var monimoDomain = "";
      monimoDomain = "https://www.monimo.com"; // 모니모 카드 도메인 [운영]
      return monimoDomain;
    },

    /**
     * Full URL 주소 리턴
     *
     * @param tranId
     *            페이지/데이터 트랜 ID 또는 url 주소
     * @param data
     *            데이터 Object(선택)
     * @return 화면 full URL 주소 리턴
     */
    getTranUrl: function (tranId, data) {
      var returnUrl = "";
      if (ih.util.isEmpty(tranId)) {
        tranId = "";
      }
      if (tranId.startsWith("http")) {
        returnUrl = tranId;
      } else {
        var base = document.URL || location.href;
        base = base.substr(0, base.indexOf("/", base.indexOf("//") + 2));
        var result = /^VH\.H(?<type>[PSD]){1}[A-Z]{2}[A-Z0-9]{1}[0-9]{3}$/.exec(
          tranId
        );
        if (null != result) {
          if (result.groups.type === "D") {
            returnUrl = base + "/vh/data/" + tranId + ".do";
          } else {
            returnUrl = base + "/vh/page/" + tranId + ".do";
          }
        } else {
          returnUrl = base + (tranId.startsWith("/") ? "" : "/") + tranId;
        }
      }

      if (data) {
        var params = ih.util.objectToUrlParams(data);
        if (params) {
          returnUrl =
            returnUrl + (returnUrl.indexOf("?") >= 0 ? "&" : "?") + params;
        }
      }
      return returnUrl;
    },

    /**
     * 로그인 사용자 정보를 가져온다
     *
     * @param callback
     *            결과 콜백
     * 		      콜백 데이터 {
     *      		     		"mnmCstMngtNo": [모니모 고객관리번호],
     *                          "mobileNo" : [휴대폰번호:*마스킹]
     *		        			"simpleYn": [간편로그인여부:Y|N],
     *		        			"sfCustYn": [삼성화재계약고객여부:Y|N],
     *		        			"memberYn": [삼성화재홈페이지회원여부:Y|N],
     *							"custId" : [BPID],
     *		        			"chnlCd": [채널구분값:MO|MA|MW],
     *		        			"name": [고객이름|*마스킹],
     *		        			"birthYn": [오늘생일여부],
     *		        			"dupYn": [중복로그인여부:Y|N],
     *		        			"ssn": [주민등록번호:뒤7자리*마스킹]
     *		      			}
     */
    getLoginUser: function (callback) {
      // 로그인 정보 조회
      ih.sendRequest("VH.HDLO0001", null, { loading: false, error: false })
        .then(function (response) {
          ih.debug("로그인 사용자 정보 조회 결과", response);
          if ("S" === response.result) {
            if (callback) callback(response.data);
          } else {
            if (callback) callback({}); // 로그인 상태 아닌경우 빈값 전달
          }
        })
        .catch(function (error) {
          ih.debug("로그인 사용자 정보 조회 실패", error);
          if (callback) callback({}); // 에러 발생시 빈값 전달
        });
    },
    nonMemberLogin: function (opts) {
      opts = opts || {};
      if (ih.env.deviceType != "MN") {
        /**
         * 비회원본인인증(로그인)
         * opts {
         *    returnURL :  회원로그인 성공시 이동할 페이지 URL
         *    pageList  :  비회원로그인대상 페이지목록 (페이지트랜ID 또는 HTML) ex) ['VH.HPCLA002','VH.HPCLA003']
         * }
         */
        var param = {};
        param.returnURL = !ih.util.isEmpty(opts.returnURL)
          ? opts.returnURL
          : null;
        param.pageList = !ih.util.isEmpty(opts.pageList) ? opts.pageList : null;
        var modalOption = {
          id: "IH_LO_NonMemberLoginPop",
          link: "/vh/page/VH.HPLO0003.do",
          param: opts,
          callback: function (result) {
            if (opts.callback)
              opts.callback(result && result.result == "Y" ? "Y" : "N");
          },
        };
        ih.ui.modalOpen(modalOption);
      } else {
        if (opts.callback) opts.callback("N");
      }
    },
    login: function (returnURL) {
      if (ih.env.deviceType != "MN") {
        var loginURL = "/vh/page/VH.HPLO0001.do";
        if (!ih.util.isEmpty(returnURL)) {
          loginURL = loginURL + "?returnURL=" + encodeURIComponent(returnURL);
        }
        location.href = loginURL;
      } else {
        ih.native.closeCurBrowser();
      }
    },
    memberLoginCheck: function (returnURL, callback) {
      ih.getLoginUser(function (result) {
        if (result && result.memberYn == "Y") {
          callback(result);
        } else {
          ih.login(returnURL);
        }
      });
    },
    logOut: function () {
      location.href = "/vh/page/VH.HPLO0002.do";
    },
  };

  var internal = {
    /**
     * 관리되는 SendRequest 대상 리스트
     */
    managedRequest: [],
  };

  self.load();
  return self;
})();

/*
 * ih.util
 */
window.ih.util = {};
ih.util = (function () {
  var self = {
    /**
     * 빈 객체 여부 확인
     *
     * @param obj
     *            string/array 객체
     * @return null객체 or 문자열 사이즈 0, 배열 사이즈 0인 경우 true리턴
     */
    isEmpty: function (obj) {
      if (obj == undefined || obj == null) {
        return true;
      } else if (typeof obj == "string" && obj == "") {
        return true;
      } else if (obj instanceof Array && obj.length == 0) {
        return true;
      }
      return false;
    },

    /**
     * 랜덤 uuid 생성
     *
     * @return 36자리 랜덤 uuid 리턴 (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
     */
    uuid: function () {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
          var r = (Math.random() * 16) | 0,
            v = c == "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        }
      );
    },

    /**
     * timeout 경과 후에 func을 실행
     *
     * @param func
     *            실행할 함수
     * @param timeout
     *            지연시간 ms
     * @return timerId 리턴
     */
    execTimer: function (func, timeout) {
      var execTimerId = null;
      (function () {
        execTimerId = setTimeout(function () {
          if (execTimerId) {
            clearTimeout(execTimerId);
          }
          if (func) {
            func();
          }
        }, timeout);
      })();
      return execTimerId;
    },

    /**
     * 특수문자 복호화 (&lt;, &gt;, &#40;, &#41;, &quot;, &#039;)
     *
     * @param paramValue
     *            복호화할 문자열
     * @return 특수문자 복호화된 문자열
     */
    XSSValidator: function (paramValue) {
      var returnValue = "";
      if (!this.isEmpty(paramValue)) {
        paramValue = paramValue.replaceAll("&lt;", "<");
        paramValue = paramValue.replaceAll("&gt;", ">");
        paramValue = paramValue.replaceAll("&#40;", "(");
        paramValue = paramValue.replaceAll("&#41;", ")");
        paramValue = paramValue.replaceAll("&quot;", '"');
        paramValue = paramValue.replaceAll("&#039;", "'");
        returnValue = paramValue;
      }
      return returnValue;
    },

    /**
     * 특수문자 암호화 (<, >, (, ), ", ')
     *
     * @param paramValue
     *            암호화할 문자열
     * @return 특수문자 암호화된 문자열
     */
    XSSREValidator: function (paramValue) {
      var returnValue = "";
      if (!this.isEmpty(paramValue)) {
        paramValue = paramValue.replaceAll("<", "&lt;");
        paramValue = paramValue.replaceAll(">", "&gt;");
        paramValue = paramValue.replaceAll("(", "&#40;");
        paramValue = paramValue.replaceAll(")", "&#41;");
        paramValue = paramValue.replaceAll('"', "&quot;");
        paramValue = paramValue.replaceAll("'", "&#039;");
        returnValue = paramValue;
      }
      return returnValue;
    },

    /**
     * 배열에 항목 포함여부 확인
     *
     * @param arr
     *            배열
     * @param item
     *            포함여부 확인할 항목
     * @return 배열에 항목 포함시 true 리턴
     */
    contains: function (arr, item) {
      if (!this.isEmpty(item) && Array.isArray(arr)) {
        for (var i = 0; i < arr.length; i++) {
          if (item === arr[i]) {
            return true;
          }
        }
      }
      return false;
    },

    /**
     * Object 복사 (src -> target)
     *
     * @param src
     *            원본 Object
     * @param target
     *            복사 대상 Object
     */
    copyObject: function (src, target) {
      if (
        src &&
        typeof src == "object" &&
        target &&
        typeof target == "object"
      ) {
        for (var k in src) {
          target[k] = src[k];
        }
      }
    },

    /**
     * Object 복사 (src -> target)
     *
     * 하위 레벨 Object, Object로 구성된 Array까지 모두 복사함
     *
     * @param src
     *            원본 Object
     * @param dst
     *            복사 대상 Object
     * @param allowedKeys
     * 			  복사허용할 key리스트, 생략시 전체 복사
     */
    copyObjectLv: function (src, dst, allowedKeys) {
      if (src) {
        if (src instanceof Object) {
          var keys = Object.keys(src);
          for (var i = 0; i < keys.length; i++) {
            if (!allowedKeys || ih.util.contains(allowedKeys, keys[i])) {
              if (src[keys[i]] instanceof Array) {
                dst[keys[i]] = [];
                for (var j = 0; j < src[keys[i]].length; j++) {
                  dst[keys[i]][j] = {};
                  this.copyObjectLv(
                    src[keys[i]][j],
                    dst[keys[i]][j],
                    allowedKeys
                  );
                }
              } else if (src[keys[i]] instanceof Object) {
                dst[keys[i]] = {};
                this.copyObjectLv(src[keys[i]], dst[keys[i]], allowedKeys);
              } else {
                dst[keys[i]] = src[keys[i]];
              }
            }
          }
        } else {
          ih.debug("copyObjectLv : 입력값 오류1");
        }
      } else {
        ih.debug("copyObjectLv : 입력값 오류2");
      }
    },

    /**
     * form을 ojbect로 변환
     *
     * @param form
     *            폼데이터
     * @return Object
     */
    serializeObject: function (form) {
      var obj = {};
      if (form) {
        for (var i = 0; i < form.length; i++) {
          var name = form[i].name;
          var value = form[i].value;
          var type = form[i].type;
          if (!this.isEmpty(name)) {
            if (type == "radio" || type == "checkbox") {
              if (!form[i].checked) {
                continue;
              }
            }
            if (obj[name]) {
              if (typeof obj[name] == "string") {
                obj[name] = [obj[name]];
              }
              obj[name].push(value);
            } else {
              obj[name] = value;
            }
          }
        }
      }
      return obj;
    },

    /**
     * 숫자 한글 변환
     *
     * @param num
     *            한글 변환할 숫자
     * @return 한글로 변환된 숫자
     */
    numToHan: function (num) {
      var result = "";
      var n = num;
      if (typeof n === "number") {
        n = "" + num;
      }
      if (typeof n === "string" && n !== "") {
        n = n.replace(/[^0-9]+/g, "");
        var a1 = new Array(
          "",
          "일",
          "이",
          "삼",
          "사",
          "오",
          "육",
          "칠",
          "팔",
          "구",
          "십"
        );
        var a2 = new Array(
          "",
          "십",
          "백",
          "천",
          "",
          "십",
          "백",
          "천",
          "",
          "십",
          "백",
          "천",
          "",
          "십",
          "백",
          "천"
        );
        for (var i = 0; i < n.length; i++) {
          var str = "";
          var han = a1[n.charAt(n.length - (i + 1))];
          if (han != "") {
            str += han + a2[i];
            if (i == 4) str += "만";
            if (i == 8) str += "억";
            if (i == 12) str += "조";
            result = str + result;
          }
        }
      }
      return result;
    },

    /**
     * 숫자 단위 한글 변환 (수 단위만 한글 변환)
     *
     * @param val
     *            한글 단위로 변환할 숫자
     * @param val
     *            true : '만단위금액변환', false : "일단위금액변환"
     * @param wonUnit
     *            true : '만원단위삭제', false : "만원단위포함"
     * @return 한글 단위로 변환된 숫자
     */
    numUnitToHan: function (val, manCls, wonUnit) {
      if (!this.isEmpty(val)) {
        if (!manCls) val = val.substr(0, val.length - 4);
        val = this.comma(val);
        if (val.length > 5) {
          var commaChg = this.comma(
            val.substr(0, val.length - 5).replace(/[^0-9]/g, "")
          );
          var manChg = parseInt(
            val.substr(val.length - 5, val.length).replace(/[^0-9]/g, "")
          );
          var uk = "";
          var man = "";
          if (wonUnit) {
            man = manChg == 0 ? "" : " " + this.comma(manChg + "");
            uk = man == "" ? commaChg : commaChg + "억";
          } else {
            uk = commaChg + "억";
            man = manChg == 0 ? "원" : " " + this.comma(manChg + "") + "만원";
          }

          val = uk + man;
        } else {
          if (val == "0" || val == "") {
            val = "";
          } else if (!wonUnit) {
            val = val + "만원";
          }
        }
      }
      return val;
    },

    /**
     * Url Parameter를 Object로 변환
     *
     * @param urlParam
     *            "name1=value1&name2=value2&name3=value3" 형식의 문자열
     * @returns Object
     */
    urlParamsToObject: function (urlParam) {
      if (this.isEmpty(urlParam) || typeof urlParam != "string") {
        return {};
      }
      var param = urlParam;

      if (param.startsWith("?")) {
        param = param.slice(1);
      }

      var result = {};
      try {
        var arrParam = param.split("&");
        var inArr, name, value;
        for (var i in arrParam) {
          var idx = arrParam[i] && arrParam[i].indexOf("=");
          if (idx > 0) {
            var key = arrParam[i].substring(0, idx);
            var value = arrParam[i].substring(idx + 1);
            result[key] = value.startsWith("encode_")
              ? JSON.parse(this.base64.decode(value.substring(7)))
              : decodeURIComponent(value);
          }
        }
      } catch (e) {
        ih.debug("[urlParamsToObject] exception occurred", e);
      }
      return result;
    },

    /**
     * Object를 Url Parameter로 변환
     * @param object 데이터
     * @returns "name1=value1&name2=value2&name3=value3" 형식의 문자열
     */
    objectToUrlParams: function (object) {
      if (this.isEmpty(object)) {
        return "";
      }
      var result = "";
      try {
        var keys = Object.keys(object);
        for (var i = 0; i < keys.length; i++) {
          var param =
            typeof object[keys[i]] === "object"
              ? "encode_" + this.base64.encode(JSON.stringify(object[keys[i]]))
              : object[keys[i]];
          result += i != 0 ? "&" : "";
          result += keys[i] + "=" + param;
        }
      } catch (e) {
        ih.debug("[objectToUrlParams] exception occurred", e);
      }
      return result;
    },

    // 한글 지원 Base64
    base64: {
      /**
       * Base64 암호화 (한글 지원)
       * @param str 대상 문자열
       * @return Base64 암호화 리턴
       */
      encode: function (str) {
        return btoa(
          encodeURIComponent(str).replace(
            /%([0-9A-F]{2})/g,
            function (match, p1) {
              return String.fromCharCode(parseInt(p1, 16));
            }
          )
        );
      },

      /**
       * Base64 복호화 (한글 지원)
       * @param str 대상 문자열
       * @return Base64 복호화 리턴
       */
      decode: function (str) {
        return decodeURIComponent(
          Array.prototype.map
            .call(atob(str), function (c) {
              return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join("")
        );
      },
    },

    // 쿠키 제어
    cookie: {
      /**
       * 쿠키 설정
       *
       * @param key
       *            키
       * @param value
       *            값
       * @param expiredays
       *            쿠키 만료일
       * @return 쿠키 정보 리턴
       */
      set: function (key, value, expiredays) {
        expiredays = expiredays || 1;

        var today = new Date();
        today.setDate(today.getDate() + expiredays);
        today.setHours(0, 0, 0, 0);

        var arr = [];
        arr.push(key + "=" + escape(value));
        arr.push("path=/");
        arr.push("expires=" + today.toGMTString());
        document.cookie = arr.join("; ");

        return document.cookie;
      },

      /**
       * 쿠키 조회
       *
       * @param key
       *            키
       * @return 쿠키값 턴
       */
      get: function (key) {
        var docCookie = document.cookie,
          regx = new RegExp(key + "=(.*?)(?=;|$)"),
          matched = docCookie.match(regx);
        if (matched) {
          return unescape(matched[1]);
        }

        return undefined;
      },

      /**
       * 쿠키 삭제
       *
       * @param key
       *            키
       * @return 쿠키 정보 리턴
       */
      del: function (key) {
        var today = new Date();
        today.setDate(today.getDate());

        var arr = [];
        arr.push(key + "=");
        arr.push("path=/");
        arr.push("expires=" + today.toGMTString());
        document.cookie = arr.join("; ");

        return document.cookie;
      },
    },

    /**
     * 네이티브 페이지 오픈
     * 모니모/삼성화재 앱 : 화면이동 bridge 호출
     */
    OpenNative: function (code) {
      if (ih.env.deviceType === "MN") {
        ih.native.OpenNative(code);
      }
    },

    /**
     * 카오톡을 실행시켜 특정경로/이미지등을 공유한다.
     * 파라미터 중 모든 URL 은 전체 경로를 전달하도록 한다.
     *
     * 예) imageUrl: "http://domain.com/path?image=xxx"
     *
     * @param params 카카오톡 호출 시 전달할 데이터
     *  1. feed
     *	{
     *		[M] type: "feed",
     *		[M] content(Content):메시지의 메인 콘텐츠 정보
     *		[O] buttons(Button Array):버튼 목록(최대 2개), 버튼 타이틀과 링크를 변경할 때, 버튼 두개를 넣을 때 사용
     *	}
     *
     *	2. text
     *	{
     *		[M] type: "text",
     *		[M] text(String):텍스트 정보, 최대 200자
     *		[M] link(Link):콘텐츠 클릭 시 이동할 링크 정보
     *		[O] buttons(Button Array):버튼 목
     *		록(최대 2개), 버튼 타이틀과 링크를 변경할 때, 버튼 두개를 넣을 때 사용
     *	}
     *
     *	*** 공통 사용 객체 ***
     * 	Content(Object): {
     *		[M] title(String):콘텐츠의 타이틀
     *		[M] imageUrl(String):콘텐츠의 이미지 URL
     *		[M] link(Link):콘텐츠 클릭 시 이동할 링크 정보
     *	}
     *	Button(Object): {
     *		[M] title(String):버튼의 타이틀
     *		[M] link(Link):버튼클릭 시 이동할 링크 정보(하나는 필수로 존재해야 함.)
     *	}
     *	Link(Object): { // 1개 이상 필수
     *		[M] webUrl(String):PC버전 카카오톡에서 사용하는 웹 링크 URL
     *		[M] mobileWebUrl(String): 모바일 카카오톡에서 사용하는 웹 링크 URL
     *		[O] isOpenWeb(String): (신규추가) Y:Web으로 열기, N:App으로열기 (디폴트:App으로 열기, 필드값이 없는 경우도) : 웹에서 호출경우 해당 파라미터 무시 처리됨
     *	}
     */
    shareKakao: function (params) {
      if (ih.env.deviceType === "MN" || ih.env.deviceType === "MA") {
        ih.native.shareKakao(params);
      } else {
        var shareJs = function () {
          if (params) {
            var data = {};
            var allowedKey = [
              "container",
              "objectType",
              "content",
              "text",
              "imageUrl",
              "buttons",
              "link",
              "title",
              "webUrl",
              "mobileWebUrl",
            ];
            ih.util.copyObjectLv(params, data, allowedKey);

            if (params.type) {
              data.objectType = params.type;
            }

            if (data.container) {
              Kakao.Share.createDefaultButton(data);
            } else {
              Kakao.Share.sendDefault(data);
            }
          } else {
            ih.debug("공유 데이터 오류");
          }
        };

        if (!window.Kakao) {
          $.getScript("/resources/js/kakao.min.js").done(function () {
            ih.debug("kakao js Load success!! ");
            Kakao.init("deb7165f8f3a3ae80f2ba8143457191f");
            shareJs();
          });
        } else {
          shareJs();
        }
      }
    },

    /*-----------------------------------------------------------------*/
    /*                                                                 */
    /*                            저장소 관련 유틸                                             */
    /*                                                                 */
    /*-----------------------------------------------------------------*/

    /**
     * 세션 스토리지 키 값 저장
     *
     * @param key
     *            구분키
     * @param value
     *            값
     */
    setStorageItem: function (key, value) {
      if (window.sessionStorage) {
        var data = {};
        data[key] = value;
        window.sessionStorage.setItem(key, JSON.stringify(data));
      }
    },

    /**
     * 세션 스토리지 키 값 읽기
     *
     * @param key
     *            구분키
     */
    getStorageItem: function (key) {
      if (window.sessionStorage) {
        var data = window.sessionStorage.getItem(key);
        if (data) {
          return JSON.parse(data)[key];
        }
      }
      return null;
    },

    /**
     * 세션 스토리지 키 값 삭제
     *
     * @param key
     *            구분키
     */
    removeStorageItem: function (key) {
      if (window.sessionStorage) {
        window.sessionStorage.removeItem(key);
      }
    },

    /**
     * 스토리지 키 값 저장 (모니모 앱인경우 디바이스 저장공간, 웹인경우 로컬 스토리지 사용)
     * 모니모 인터페이스와 동일한 동작되도록 콜백구조로 결과값 전달
     *
     * @param key
     *            구분키
     * @param value
     *            값
     * @param callback
     *            결과 콜백 {result : true/false}
     */
    setLocalStorageItem: function (key, value, callback) {
      if (ih.env.deviceType === "MN") {
        ih.native.setDeviceStorage(key, value, callback);
      } else {
        window.localStorage.setItem(key, value);
        if (callback) {
          callback({ data: { result: true } });
        }
      }
    },

    /**
     * 스토리지 키 값 읽기 (모니모 앱인경우 디바이스 저장공간, 웹인경우 로컬 스토리지 사용)
     * 모니모 인터페이스와 동일한 동작되도록 콜백구조로 결과값 전달
     *
     * @param key
     *            구분키
     * @param callback
     *            결과 콜백 {result : true/false, key : 구분키, value : 저장된 데이터}
     */
    getLocalStorageItem: function (key, callback) {
      if (ih.env.deviceType === "MN") {
        ih.native.getDeviceStorage(key, callback);
      } else {
        var data = window.localStorage.getItem(key, data);
        //data = data ? JSON.parse(data)[key] : null;
        if (callback) {
          callback({ data: { result: true, key: key, value: data } });
        }
      }
    },

    /**
     * 스토리지 키 값 삭제 (모니모 앱인경우 디바이스 저장공간, 웹인경우 로컬 스토리지 사용)
     *
     * @param key
     *            구분키
     * @param callback
     *            결과 콜백 {result : true/false}
     */
    removeLocalStorageItem: function (key, callback) {
      if (ih.env.deviceType === "MN") {
        ih.native.setDeviceStorage(key, "", callback);
      } else {
        window.localStorage.removeItem(key);
        if (callback) {
          callback({ data: { result: true } });
        }
      }
    },

    /**
     * 특정문자열을 클립보드에 저장한다.
     *
     * 모니모인경우 앱인터페이스 호출, 그외 클립보드 API호출(문서에 focus가 가 있어야 정상 동작함)
     *
     * @param data
     *            클립보드에 저장할 문자열
     * @param msg
     *            저장 완료되었을 경우 표시할 메시지
     *
     */
    setClipBoard: function (data, msg) {
      if (ih.env.deviceType === "MN" || ih.env.deviceType === "MA") {
        ih.native.setClipBoard(data, msg);
      } else {
        /*
			else if(ih.env.deviceType === "MA"){
				// execCommand 사용
			    var textArea = document.createElement("textarea");
			    textArea.value = data;
			    document.body.appendChild(textArea);
			    textArea.select();
			    try{
			         document.execCommand("copy");
			         console.log('클립보드 저장 성공');
			    }catch(error){
			         console.log('클립보드 저장 실패', error);
			    }finally{
			         document.body.removeChild(textArea);    
			    }
			}
			*/
        if (location.protocol == "https:" && navigator.clipboard) {
          navigator.clipboard
            .writeText(data)
            .then(function () {
              console.log("클립보드 저장 성공");
            })
            .catch(function (error) {
              console.log("클립보드 저장 실패", error);
            });
        } else {
          ih.ui.alert("지원되지 않는 기능입니다.");
        }
      }
    },

    /**
     * 클립보드에 저장된 문자열을 꺼낸다.
     *
     * 모니모인경우 앱인터페이스 호출, 그외 클립보드 API호출(문서에 focus가 가 있어야 정상 동작함)
     *
     *
     * @param callback 결과값을 전달받을 콜백
     * 				{
     * 					result : true/false
     *                  data : 클립보드 데이터
     * 				}
     */
    getClipBoard: function (callback) {
      if (ih.env.deviceType === "MN" || ih.env.deviceType === "MA") {
        ih.native.getClipBoard(callback);
      } else {
        if (location.protocol == "https:" && navigator.clipboard) {
          navigator.clipboard
            .readText()
            .then(function (data) {
              console.log("클립보드 읽기 성공", data);
              if (callback) {
                callback({
                  result: true,
                  data: data,
                });
              }
            })
            .catch(function (error) {
              console.log("클립보드 읽기 실패", error);
              if (callback) {
                callback({
                  result: false,
                  data: undefined,
                });
              }
            });
        } else {
          ih.ui.alert("지원되지 않는 기능입니다.");
        }
      }
    },

    /*-----------------------------------------------------------------*/
    /*                                                                 */
    /*                            날짜 관련 유틸                                                */
    /*                                                                 */
    /*-----------------------------------------------------------------*/

    /**
     * (val2 - val1) 차이 일수 리턴
     *
     * @param val1
     *            시작날짜 ("YYYY.MM.DD")
     * @param val1
     *            시작날짜 ("YYYY.MM.DD")
     * @return 시작날짜와 종료날짜 사이 일수(Day)리턴
     */
    diffDate: function (val1, val2) {
      var FORMAT = ".";
      // FORMAT을 포함한 길이 체크
      if (val1.length != 10 || val2.length != 10) return null;
      // FORMAT이 있는지 체크
      if (val1.indexOf(FORMAT) < 0 || val2.indexOf(FORMAT) < 0) return null;

      // 년도, 월, 일로 분리
      var start_dt = val1.split(FORMAT),
        end_dt = val2.split(FORMAT);

      start_dt[1] = Number(start_dt[1]) - 1 + "";
      end_dt[1] = Number(end_dt[1]) - 1 + "";

      var from_dt = new Date(start_dt[0], start_dt[1], start_dt[2]),
        to_dt = new Date(end_dt[0], end_dt[1], end_dt[2]);

      return (to_dt.getTime() - from_dt.getTime()) / 1000 / 60 / 60 / 24;
    },

    /**
     * 문자열 날짜의 format 변환
     *
     * @param sDate 날짜문자열
     *
     * @return delimiter 날짜 구분 문자(ex: ".", "-", "/" )
     */
    setDateDelim: function (sDate, delim) {
      if (!this.isEmpty(sDate)) {
        sDate = sDate.replace(/[^0-9]/g, "");
        delim = delim ? delim : "";
        if (sDate.length === 8) {
          return (
            sDate.substring(0, 4) +
            delim +
            sDate.substring(4, 6) +
            delim +
            sDate.substring(6, 8)
          );
        } else if (sDate.length === 6) {
          return sDate.substring(0, 4) + delim + sDate.substring(4, 6);
        }
      }
      return sDate;
    },

    /**
     * Date를 포멧팅된 날짜 문자열로 변환
     *
     * @param date
     *            날짜
     * @param format
     *            날짜 출력 포멧
     * @return Date를 포멧팅된 날짜 문자열로 변환하여 리턴
     */
    dateToFormatString: function (date, format) {
      var formatToString = {
        shortMonths: [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ],
        longMonths: [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ],
        shortDays: ["일", "월", "화", "수", "목", "금", "토"],
        longDays: [
          "일요일",
          "월요일",
          "화요일",
          "수요일",
          "목요일",
          "금요일",
          "토요일",
        ],

        // Day
        dd: function (date) {
          return (date.getDate() < 10 ? "0" : "") + date.getDate();
        },
        d: function (date) {
          return date.getDate();
        },

        // Weekly
        wks: function (date) {
          return date.getDate() % 10 == 1 && date.getDate() != 11
            ? "st"
            : date.getDate() % 10 == 2 && date.getDate() != 12
            ? "nd"
            : date.getDate() % 10 == 3 && date.getDate() != 13
            ? "rd"
            : "th";
        },
        ws: function (date) {
          return this.shortDays[date.getDay()];
        },
        wl: function (date) {
          return this.longDays[date.getDay()];
        },
        wa: function (date) {
          return date.getDay() + 1;
        },
        w: function (date) {
          return date.getDay();
        },

        // Month
        mm: function (date) {
          return (date.getMonth() < 9 ? "0" : "") + (date.getMonth() + 1);
        },
        m: function (date) {
          return date.getMonth() + 1;
        },
        ml: function (date) {
          return this.longMonths[date.getMonth()];
        },
        ms: function (date) {
          return this.shortMonths[date.getMonth()];
        },

        // Year
        yyyy: function (date) {
          return date.getFullYear();
        },
        yy: function (date) {
          return ("" + date.getFullYear()).substring(2);
        },
        yyl: function (date) {
          return (date.getFullYear() % 4 == 0 &&
            date.getFullYear() % 100 != 0) ||
            date.getFullYear() % 400 == 0
            ? "1"
            : "0";
        },

        // Hour
        HH: function (date) {
          return (date.getHours() < 10 ? "0" : "") + date.getHours();
        },
        hh: function (date) {
          return (
            ((date.getHours() % 12 || 12) < 10 ? "0" : "") +
            (date.getHours() % 12 || 12)
          );
        },
        hap: function (date) {
          return date.getHours() < 12 ? "am" : "pm";
        },
        HAP: function (date) {
          return date.getHours() < 12 ? "AM" : "PM";
        },
        h12: function (date) {
          return date.getHours() % 12 || 12;
        },
        h: function (date) {
          return date.getHours();
        },

        // Minute
        mi: function (date) {
          return (date.getMinutes() < 10 ? "0" : "") + date.getMinutes();
        },

        // Second
        ss: function (date) {
          return (date.getSeconds() < 10 ? "0" : "") + date.getSeconds();
        },

        // Timezone
        O: function (date) {
          return (
            (-date.getTimezoneOffset() < 0 ? "-" : "+") +
            (Math.abs(date.getTimezoneOffset() / 60) < 10 ? "0" : "") +
            Math.abs(date.getTimezoneOffset() / 60) +
            "00"
          );
        },
        P: function (date) {
          return (
            (-date.getTimezoneOffset() < 0 ? "-" : "+") +
            (Math.abs(date.getTimezoneOffset() / 60) < 10 ? "0" : "") +
            Math.abs(date.getTimezoneOffset() / 60) +
            ":" +
            (Math.abs(date.getTimezoneOffset() % 60) < 10 ? "0" : "") +
            Math.abs(date.getTimezoneOffset() % 60)
          );
        },
        T: function (date) {
          var m = date.getMonth();
          date.setMonth(0);
          var result = date.toTimeString().replace(/^.+ \(?([^\)]+)\)?$/, "$1");
          date.setMonth(m);
          return result;
        },
        Z: function (date) {
          return -date.getTimezoneOffset() * 60;
        },
        // Full Date/Time
        c: function (date) {
          return (
            homepageJS.convertDateToString(date, "Y-m-d") +
            "T" +
            homepageJS.convertDateToString(date, "H:i:sP")
          );
        },
        r: function (date) {
          return date.toString();
        },
        U: function (date) {
          return date.getTime() / 1000;
        },
      };

      return format.replace(
        /(dd|d|wks|ws|wl|wa|w|mm|ml|ms|mi|m|yyyy|yy1|yy|HH|hh|hap|Hap|HAP|h12|h|ss|O|P|T|Z|c|r|U)/gi,
        function ($1) {
          if (formatToString[$1]) {
            return formatToString[$1](date);
          } else {
            return $1;
          }
        }
      );
    },

    /**
     * Date를 문자열로 변환 (YYYY.MM.DD)
     *
     * @param date
     *            날짜(Date)
     * @param delim
     *            날짜 구분 문자 (default : ".")
     * @return 구분자(delim)로 구분된 날짜 문자열 (YYYY.MM.DD)
     */
    dateToString: function (date, delim) {
      //Date를 문자열로 변환
      if (this.isEmpty(delim)) {
        delim = ".";
      }
      var year = date.getFullYear();
      var month = date.getMonth() + 1;
      var date = date.getDate();
      return (
        year +
        delim +
        (month >= 10 ? month : "0" + month) +
        delim +
        (date >= 10 ? date : "0" + date)
      );
    },

    /**
     * 문자열 날짜를 Date로 변환
     *
     * @param sDate
     *            날짜문자열
     * @return 날짜(Date) 객체
     */
    stringToDate: function (sDate) {
      //문자열을 Date로
      if (!this.isEmpty(sDate)) {
        sDate = sDate.replace(/[^0-9]/g, "");
        var year = parseInt(sDate.substring(0, 4));
        var month = parseInt(sDate.substring(4, 6), 10);
        var date = parseInt(sDate.substring(6, 8), 10);
        return new Date(year, month - 1, date);
      }
      return null;
    },

    /**
     * sDate 날짜에서 cls(Y/M/D)를 val만큼 증가함
     *
     * @param sDate
     *            날짜(Date) 또는 날짜 문자열
     * @param cls
     *            변경구분(년/월/일) ["Y"|"M"|"M2"|"D"]
     *
     *            ※ cls="M", cls="M2" 차이
     *        	   - c sDate='20250131', val=1인 경우
     *             - cls="M"인 경우 결과값 : 20250303
     *             - cls="M2"인 경우 결과값 : 20250228
     * @param val
     *            증가값
     * @return val만큼 증가된 날짜(date) 객체 리턴
     */
    addDate: function (sDate, cls, val) {
      //날짜 설정
      if (!this.isEmpty(sDate)) {
        var tDate = null;
        if (sDate instanceof Date) {
          tDate = sDate;
        } else {
          tDate = this.stringToDate(sDate);
        }
        if (tDate != null) {
          if (cls == "Y") {
            tDate.setFullYear(tDate.getFullYear() + val);
          } else if (cls == "M") {
            /**
             * 기준월 말일이 계산 후 말일을 초과한 경우 남는 날짜 수 만큼 더해져서 다음 달이 된다.
             * ex. addDate('20250131', 'M', 1) -> 2025.03.03
             */
            tDate.setMonth(tDate.getMonth() + val);
          } else if (cls == "M2") {
            var oldDay = tDate.getDate();
            tDate.setMonth(tDate.getMonth() + val);
            /**
             * 기준월 말일이 계산 후 말일을 초과한 경우 남는 날짜 수 만큼 더해져서 다음 달이 된다.
             * 이 경우 다음 달 1일로 세팅하고 하루를 빼줘서 말일로 만들어준다.
             * ex) addDate('20250131', 'M', 1) -> 2025.02.28)
             */
            if (tDate.getDate() != oldDay) {
              tDate.setDate(1); // 실제 월의 다음 달로 되어있으므로 1일로 세팅 후
              var millisec = tDate.getTime(); // 날짜를 밀리세컨드 값으로 변환
              millisec = millisec + -1 * 24 * 60 * 60 * 1000; // 하루를 빼준다.
              tDate.setTime(millisec);
            }
          } else if (cls == "D") {
            tDate.setDate(tDate.getDate() + val);
          }
          return tDate;
        }
      }
      return null;
    },

    /**
     * sDate 날짜에서 '년도'를 val만큼 증가함
     *
     * @param sDate
     *            날짜(Date) 또는 날짜 문자열
     * @param val
     *            '년'수 증가값
     * @return val만큼 '년'수 증가된 날짜 문자열 리턴
     */
    addYear: function (sDate, val) {
      //년 증가.
      return this.dateToString(this.addDate(sDate, "Y", val));
    },

    /**
     * sDate 날짜에서 '월'을 val만큼 증가함
     *
     * 기준월 말일이 계산 후 말일을 초과한 경우 남는 날짜 수 만큼 더해져서 다음 달이 된다.
     * ex) ih.util.addMonth('20250131', '1') -> '2025.03.03'
     * 입력기준일 일수 : 31일, 결과월(2월)의 말일 : 28일  -> 남은 날짜수 3이 더해져 3월 3일이 됨
     *
     * @param sDate
     *            날짜(Date) 또는 날짜 문자열
     * @param val
     *            '년'수 증가값
     * @return val만큼 '년'수 증가된 날짜 문자열 리턴
     */
    addMonth: function (sDate, val) {
      //월 증가.
      return this.dateToString(this.addDate(sDate, "M", val));
    },

    /**
     * sDate 날짜에서 '월'을 val만큼 증가함
     *
     * 기준월 말일이 계산 후 말일을 초과한 경우 해당월의 막달을 리턴한다.
     * ex) ih.util.addMonth('20250131', '1') -> '2025.02.28'
     *
     * @param sDate
     *            날짜(Date) 또는 날짜 문자열
     * @param val
     *            '년'수 증가값
     * @return val만큼 '년'수 증가된 날짜 문자열 리턴
     */
    addMonth2: function (sDate, val) {
      //월 증가.
      return this.dateToString(this.addDate(sDate, "M2", val));
    },

    /**
     * sDate 날짜에서 '년도'를 val만큼 증가함
     *
     * @param sDate
     *            날짜(Date) 또는 날짜 문자열
     * @param val
     *            '년'수 증가값
     * @return val만큼 '년'수 증가된 날짜 문자열 리턴
     */
    addDay: function (sDate, val) {
      //일자 증가
      return this.dateToString(this.addDate(sDate, "D", val));
    },

    /**
     * Date를 문자열로 변환
     *
     * @param date
     *            날짜(date), 없는경우 현재날짜
     * @param delim
     *            날짜 구분자, 없는경우 구분자 없이 출력
     * @return 날짜 문자열 (YYYYMMDD)
     */
    currentDate: function (date, delim) {
      if (date == null || date == undefined) {
        date = new Date();
      } else if (typeof date === "string") {
        delim = date;
        date = new Date();
      }
      delim = delim ? delim : "";
      var year = date.getFullYear();
      var month = date.getMonth() + 1;
      var day = date.getDate();

      return (
        year +
        delim +
        (month < 10 ? "0" + month : month + "") +
        delim +
        (day < 10 ? "0" + day : day + "") +
        ""
      );
    },

    /**
     * HH:MM:SS.mm 형태의 시간 리턴
     *
     * @param date
     *            시간(date), 없는경우 현재시간
     * @param delim
     *            시간 구분자, 없는경우 기본 구분자(':')적용됨
     * @return 시간 문자열 리턴 (HH:MM:SS.mm)
     */
    currentTime: function (date, delim) {
      if (date == null || date == undefined) {
        date = new Date();
      } else if (typeof date === "string") {
        delim = date;
        date = new Date();
      }
      delim = delim == undefined || delim == null ? ":" : delim;
      var hour = date.getHours();
      var minute = date.getMinutes();
      var second = date.getSeconds();
      var millisecond = date.getMilliseconds();

      return (
        (hour < 10 ? "0" + hour : hour) +
        delim +
        (minute < 10 ? "0" + minute : minute) +
        delim +
        (second < 10 ? "0" + second : second) +
        (delim ? "." : "") +
        (millisecond < 10 ? "00" : millisecond < 100 ? "0" : "") +
        millisecond
      );
    },

    /**
     * 영문 날짜 출력
     *
     * @param sdate
     *            날짜 문자열 (yyyymmdd)
     * @return 영문 포멧 날짜 출력 (Nov 18, 2018)
     */
    toForeignDate: function (sdate) {
      // 비정상 분자열 체크
      if (!sdate || this.isValidDate(sdate)) {
        return "";
      }

      var nDate = "";
      nDate = sdate;
      nDate = this.replaceChar(nDate, "-"); // '-' 제거
      nDate = this.replaceChar(nDate, "."); // '.' 제거
      nDate = this.replaceChar(nDate, "/"); // '/' 제거

      if (nDate.length != 8) {
        return sdate;
      }

      var year = parseInt(nDate.slice(0, 4));
      var month = parseInt(nDate.slice(4, 6)) - 1;
      var day = parseInt(nDate.slice(6, 8));

      var tempDate = new Date(year, month, day);

      var foreignDateArray = tempDate.toDateString().split(" ");

      if (foreignDateArray.length < 4) {
        return localDate;
      }

      var foreignDate =
        foreignDateArray[1] +
        " " +
        foreignDateArray[2] +
        ", " +
        foreignDateArray[3];

      return foreignDate;
    },

    /**
     * 윤년확인
     *
     * @param year
     *            윤년 여부 확인 년도
     * @return 윤영여부 true/false
     *
     * 사용방법 예): ihjs.isLeapYear("2015") -> false
     */
    isLeapYear: function (year) {
      if (100 > year) {
        year = year + 1900;
      }
      if ((0 == year % 4 && 0 != year % 100) || 0 == year % 400) {
        return true;
      } else {
        return false;
      }
    },

    /**
     * 생년월일(yyyyMMdd)을 입력받아 만나이를 리턴
     *
     * @param birthDay
     *            생년월일 (yyyyMMdd)
     * @return 만나이 리턴
     */
    calBirthDayAge: function (birthDay) {
      var year_in = 0,
        month_in = 0,
        day_in = 0,
        age = 0;
      var brith_year = 0,
        brith_month = 0,
        brith_day = 0;
      var head;

      var date = new Date();
      year_in = date.getFullYear();
      month_in =
        date.getMonth() + 1 > 9
          ? "" + (date.getMonth() + 1)
          : "0" + (date.getMonth() + 1);
      day_in = date.getDate() > 9 ? "" + date.getDate() : "0" + date.getDate();
      //만나이를 계산하기 위해 현재시간을 분해
      year_in = parseInt(year_in, 10);
      month_in = parseInt(month_in, 10);
      day_in = parseInt(day_in, 10);
      //만나이를 계산하기 위해 생년월일 분해
      brith_year = parseInt(birthDay.substring(0, 4), 10);
      brith_month = parseInt(birthDay.substring(4, 6), 10);
      brith_day = parseInt(birthDay.substring(6, 8), 10);

      age = year_in - brith_year;

      if (month_in < brith_month) {
        age = age - 1;
      } else if (month_in == brith_month) {
        if (day_in < brith_day) {
          age = age - 1;
        }
      }

      return age;
    },

    /*-----------------------------------------------------------------*/
    /*                                                                 */
    /*                            문자열 관련 유틸                                             */
    /*                                                                 */
    /*-----------------------------------------------------------------*/

    /**
     * null/"" 문자열을 ""로 변환
     *
     * @param str
     *            대상 문자열
     * @return null/"" 문자열을 ""로 변환, 아닌경우 대상문자열 리턴
     */
    nullToEmpty: function (str) {
      if (this.isEmpty(str)) {
        return "";
      }
      return str;
    },

    /**
     * null/"" 문자열을 ""로 변환
     *
     * @param str
     *            대상 문자열
     * @return null/"" 문자열을 ""로 변환, 아닌경우 대상문자열 Trim처리 후 리턴
     */
    nullToEmptyTrim: function (str) {
      return this.nullToEmpty(str).trim();
    },

    /**
     * str의 source 문자열를 target 문자열로 변경
     *
     * @param str
     *            대상 문자열
     * @param source
     *            치환할 문자열
     * @param target
     *            변경할 문자열
     * @return 변경된 문자열 리턴
     */
    replaceAll: function (str, source, target) {
      if (!this.isEmpty(str) && typeof str == "string") {
        return str.split(source).join(target);
      }
      return str;
    },

    /**
     * 문자열(str)에서 지정문자(vstr)를 제거
     *
     * @param str
     *            대상 문자열
     * @param vstr
     *            제거될 문자열
     * @return vstr문자열이 제거된 문자열 리턴
     */
    removeStr: function (str, vstr) {
      return this.replaceAll(str, vstr, "");
    },

    /**
     * 컴마로 구분된 숫자 문자열 리턴
     *
     * @param n
     *            숫자값 (문자열 또는 수)
     * @return 3자리마다 컴파(',')로 구분된 숫자 문자열 리턴
     */
    comma: function (n) {
      if (!n) return n;
      if (isNaN(n)) n = n.replace(/[^0-9,.]/g, "");

      var parts = n.toString().split(".");
      return (
        parts[0].replace(/,/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
        (parts[1] ? "." + parts[1] : "")
      );
    },

    /**
     * 문자열에서 숫자만 추출
     *
     * @param val
     *            대상 문자열
     * @return 문자열에서 추출된 숫자
     */
    onlyNumber: function (val) {
      if (!this.isEmpty(val)) {
        return val.replace(/[^0-9]/g, "");
      }
      return "";
    },

    /**
     * 문자열에서 숫자와점 추출
     *
     * @param val
     *            추출 대상 문자열
     * @return 문자열에서 추출된 숫자와점
     */
    onlyNumberPoint: function (val) {
      if (!this.isEmpty(val)) {
        return val.replace(/[^0-9\.]/g, "");
      }
      return "";
    },

    /**
     * 지정된 길이만큼 왼쪽부터 채움문자열로 채움
     * @param str	대상 문자열
     * @param size	고정 자리수
     * @param addStr	채움문자열
     * @return 지정된 길이만큼 왼쪽부터 채움문자열로 채워서 리턴
     */
    lpad: function (str, size, addStr) {
      var retVal = this.nullToEmpty(str);
      var toAdd = this.nullToEmpty(addStr);
      var len = (size - retVal.length) / toAdd.length;
      for (var i = 0; i < len; i++) {
        retVal = toAdd + retVal;
      }
      return retVal;
    },

    /**
     * 지정된 길이만큼 오른쪽부터 채움문자열로 채움
     * @param str	대상 문자열
     * @param size	고정 자리수 (대상 문자열 길이 + 채움문자열 길이)
     * @param addStr 지정된 길이만큼 오른쪽부터 채움문자열로 채워서 리턴
     * @return 고정 자리수
     */
    rpad: function (str, size, addStr) {
      var retVal = this.nullToEmpty(str);
      var toAdd = this.nullToEmpty(addStr);
      var len = (size - retVal.length) / toAdd.length;
      for (var i = 0; i < len; i++) {
        retVal = retVal + toAdd;
      }
      return retVal;
    },

    /**
     * 파일 사이즈 간결한 문자로 변경 리턴
     * @param fileSize 파일 크기
     * @return 파일 사이즈 간결한 문자로 리턴
     *
     * ex) 1024 -> 1KB
     */
    getSimpleFileSize: function (fileSize) {
      var nSize = Number(fileSize);
      var w = ["Bytes", "KB", "MB", "GB", "TB"];
      var index = 0;

      while (nSize >= 1024) {
        nSize = nSize / 1024;
        index++;
      }

      return (
        ih.util.comma(nSize != nSize.toFixed(0) ? nSize.toFixed(2) : nSize) +
        " " +
        w[index]
      );
    },

    /*-----------------------------------------------------------------*/
    /*                                                                 */
    /*                          유효성 체크 관련 유틸                                           */
    /*                                                                 */
    /*-----------------------------------------------------------------*/

    /**
     * 이메일 주소 유효성 체크
     *
     * @param email
     *            이메일 주소
     * @return 이메일 주소 유효성 여부 (true/false)
     */
    isValidEmail: function (email) {
      var regex =
        /([\w-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;
      if (this.isEmpty(email) || !regex.test(email)) {
        return false;
      }
      return true;
    },

    /**
     * 휴대폰번호 정합성 체크
     *
     * @param email
     *            mtelNo 휴대전화 번호
     * @return 휴대전화 번호 정합성 체크 결과
     */
    isValidMTelNo: function (mtelNo) {
      var valid = { result: true, message: null };
      try {
        var mTelComp = ["011", "016", "017", "018", "019", "010", "0130"];
        var chkComp = false;
        var mTelNo2 = "";
        if (!this.isEmpty(mtelNo)) {
          var mtelNoArr = mtelNo.split("-");
          if (mtelNoArr.length == 2) {
            mTelNo2 = mtelNoArr[1];
          } else if (mtelNoArr.length == 3) {
            mTelNo2 = mtelNoArr[1] + mtelNoArr[2];
          }

          mtelNo = mtelNo.replace(/[^0-9]/g, "");
        }
        var minLen = 7;
        for (var i = 0; i < mTelComp.length; i++) {
          if (
            mtelNo.length >= mTelComp[i].length &&
            mTelComp[i] == mtelNo.substring(0, mTelComp[i].length)
          ) {
            chkComp = true;
            if (this.isEmpty(mTelNo2) && mtelNo.length > mTelComp[i].length) {
              mTelNo2 = mtelNo.substring(mTelComp[i].length);
            }

            if (mTelComp[i] == "010") {
              //010인 경우는 7자리인 경우 없음 8자리 체크 필요함 (이상훈차장님 요청사항)
              minLen = 8;
            }

            break;
          }
        }
        if (!chkComp) {
          valid.message = "핸드폰번호를 정확히 입력해 주세요.";
          valid.obj = 1;
          valid.result = false;
        } else {
          if (
            mTelNo2.substring(0, 1) == 0 ||
            mTelNo2.substring(0, 4) == "1234" ||
            !this.isNumber(mTelNo2) ||
            mTelNo2.length < minLen ||
            mTelNo2.length > 8
          ) {
            valid.obj = 2;
            valid.message = "핸드폰번호를 정확히 입력해 주세요.";
            valid.result = false;
          }
        }
      } catch (e) {
        this.log(e);
      }
      return valid;
    },

    /**
     * 전화번호 정합성 체크
     *
     * @param telNo
     *            전화번호
     * @return 전화번호 정합성 체크 결과
     */
    isValidTelNo: function (telNo) {
      var valid = { result: true, message: null };
      try {
        var telArea = [
          "02",
          "051",
          "053",
          "032",
          "062",
          "042",
          "052",
          "031",
          "033",
          "043",
          "041",
          "044",
          "054",
          "055",
          "063",
          "061",
          "064",
          "070",
          "0303",
          "0502",
          "0504",
          "0505",
          "0506",
          "0507",
        ];
        var chkArea = false;
        var telNo2 = "";
        if (!this.isEmpty(telNo)) {
          var telNoArr = telNo.split("-");
          if (telNoArr.length == 2) {
            telNo2 = telNoArr[1];
          } else if (telNoArr.length == 3) {
            telNo2 = telNoArr[1] + telNoArr[2];
          }
          telNo = this.onlyNumber(telNo);
        }
        for (var i = 0; i < telArea.length; i++) {
          if (
            telNo.length >= telArea[i].length &&
            telArea[i] == telNo.substring(0, telArea[i].length)
          ) {
            chkArea = true;
            if (this.isEmpty(telNo2) && telNo.length > telArea[i].length) {
              telNo2 = telNo.substring(telArea[i].length);
            }
            break;
          }
        }
        if (!chkArea) {
          valid.obj = 1;
          valid.message = "지역번호가 유효하지 않습니다.";
          valid.result = false;
        } else {
          if (
            this.isEmpty(telNo2) ||
            !this.isNumber(telNo2) ||
            telNo2.length < 7 ||
            telNo2.length > 8
          ) {
            valid.obj = 2;
            valid.message = "유효하지 않은 전화번호 입니다.";
            valid.result = false;
          }
        }
      } catch (e) {
        console.log(e);
        valid.result = false;
        valid.message = "오류가 발생하였습니다.";
      }
      return valid;
    },

    /**
     * 날짜 문자열의 유효성을 체크
     *
     * @param sdate
     *            날짜 문자열
     * @return 유효한경우 true 아닌경우 false리턴
     */
    isValidDate: function (sdate) {
      var flag = true;
      if (sdate == null) {
        return false;
      } else if (sdate.length > 0) {
        sdate = this.replaceChar(sdate, "-"); // '-' 제거
        sdate = this.replaceChar(sdate, "."); // '-' 제거
        sdate = this.replaceChar(sdate, "/"); // '-' 제거
      }

      if (!this.isNumber(sdate)) {
        // 숫자체크
        flag = false;
      } else {
        if (sdate.length == 8) {
          var thismonth = sdate.slice(4, 6);
          var thisyear = sdate.slice(0, 4);
          var thisday = sdate.slice(6, 8);

          var montharray = new Array(
            31,
            29,
            31,
            30,
            31,
            30,
            31,
            31,
            30,
            31,
            30,
            31
          );

          // 해당되는 달의 최대 날짜를 배열에서 받는다.
          var maxdays = montharray[thismonth - 1];
          if (thismonth == 2) {
            if (
              (thisyear % 4 == 0 && thisyear % 100 != 0) ||
              thisyear % 400 == 0
            )
              maxdays = 29;
            else maxdays = 28;
          }
          thismonth = "" + thismonth;
          if (thismonth.length == 1) {
            thismonth = "0" + thismonth;
          }
          if (parseInt(thismonth) > 12) {
            flag = false;
          } else {
            if (parseInt(thisday) > maxdays) {
              flag = false;
            } else {
              flag = true;
            }
          }
        } else if (sdate.length > 0 && sdate.length < 8) {
          flag = false;
        } else if (sdate.length > 8) {
          flag = false;
        } else if (sdate.length == 0) {
          flag = false;
        }
      }
      return flag;
    },
    /**
     * [ 문자열에서 지정 문자 문자 없애기 ]
     * input - str  : 대상문자열
     *        vchar : 대상문자열에서 없애고자 하는 문자
     *
     * output - str : 문자열로 리턴
     *
     * 사용방법 예): replaceChar("1,200,400", ",")
     */
    replaceChar: function (str, vchar) {
      if (str != null && vchar != null) {
        while (str.indexOf(vchar) > -1) {
          str = str.replace(vchar, "");
        }
      }
      return str;
    },
    /**
     * 숫자 여부를 검증
     *
     * @param num
     *            숫자 검증할 문자열
     * @return 숫자로만 구성된 문자열인 경우 true리턴
     */
    isNumber: function (num) {
      if (num != null) {
        var valid = "0123456789";
        var temp;
        for (var i = 0; i < num.length; i++) {
          temp = "" + num.substring(i, i + 1);
          if (valid.indexOf(temp) == -1) {
            return false;
          }
        }
        return true;
      }
      return false;
    },

    /*-----------------------------------------------------------------*/
    /*                                                                 */
    /*                          업무 공통 유틸                                          	   */
    /*                                                                 */
    /*-----------------------------------------------------------------*/

    /**
     * 상품명 보정처리
     * (상품명에서 '무배당/유배당 삼성화재'제거)
     *
     * @param pdNm
     *            상품명
     * @return 보정된 상품명 리턴
     */
    refinePdNm: function (pdNm) {
      //--상품명보정처리
      if (this.isEmpty(pdNm)) {
        return pdNm;
      } else {
        return pdNm.replace(/((무배당|유배당)(\s*)(삼성화재)(\s*))/, "");
      }
    },
    /**
     * 고객에게 안내 또는 화면출력 시 증권번호(17자리: 000+14자리)에서 000 제거
     *
     * @param plcyNo(14자리 이상의 증권번호)
     * @return plcyNo(14자리)
     */
    cutPlcyNo: function (plcyNo) {
      if (plcyNo != null && !this.isEmpty(plcyNo)) {
        var len = plcyNo.length;
        if (len > 14) {
          return plcyNo.substring(len - 14);
        }
      }
      return plcyNo;
    },
    getURLParams: function () {
      var result = {};
      try {
        var search = location.search;
        if (!ih.util.isEmpty(search)) {
          var queryString = decodeURIComponent(search);
          if (queryString.indexOf("?") == 0) {
            queryString = queryString.substring(1);
          }
          var paramArray = queryString.split("&");
          for (var i = 0; i < paramArray.length; i++) {
            var param = paramArray[i].split("=");
            if (param.length == 1) {
              result[param[0]] = null;
            } else if (param.length == 2) {
              result[param[0]] = param[1];
            }
          }
        }
      } catch (e) {
        console.log(e);
      }
      return result;
    },
  };
  return self;
})();

/*
 * ih.fds
 */
window.ih.fds = {};
ih.fds = (function () {
  var self = {
    /**
     * FDS 체크업무 선행처리
     *  - 해당 처리는 checkFds와 시점문제로 인해 동일 시점으로 묶을 수 없는 경우 사용.
     *  [24.10.02] 안드로이드 명의도용체크(FakeFinder - NICE SDK방식) : BITMAP 항목은 총 100자리이며, 0과 1값으로 구성 ( API 23.06.22 18개 제공 )
     *             - 25.02. FakeFinder 삭제
     *  [25.02] KCB 모바일안심서비스 프로세스 추가
     */
    init: function (inParam, callback) {
      //				ih.debug("■■■■■ FDS INIT ih.env.deviceType !! ::", ih.env.deviceType);
      //				ih.debug("■■■■■ FDS INIT ih.env.os !! ::", ih.env.os);
      //				if (ih.env.deviceType === "MA" && ih.env.os === "Android") window.samsung.getFDSCheck(JSON.stringify({}));

      // TODO 3월 오픈시 반영_KCB
      if (callback) {
        if (!inParam) return ih.ui.alert("입력값을 확인해 주십시오.");
        else if (ih.util.isEmpty(inParam.fdsBusnScCd))
          return ih.ui.alert("업무구분코드를 확인해 주십시오.");

        // KCB 동의를 사전에 수행했는지여부 ( 대출(B043)의 경우, 대출 타 동의 받는 시점에 같이 받음  )
        if (ih.util.isEmpty(inParam.preAgreeYn)) inParam.preAgreeYn = "N";

        if ("Y" === inParam.preAgreeYn) {
          if (ih.util.isEmpty(inParam.clasCnsntYn))
            return ih.ui.alert("서비스이용약관동의를 확인해주십시오.");
          if (ih.util.isEmpty(inParam.pinfoThptCnsntYn))
            return ih.ui.alert(
              "개인정보 제3자 제공 동의(KCB)를 확인해주십시오."
            );
          if (ih.util.isEmpty(inParam.pinfoThptCmucoCnsntYn))
            return ih.ui.alert(
              "개인정보 제3자 제공 동의(통신사)를 확인해 주십시오."
            );
          if (ih.util.isEmpty(inParam.pinfoColtCnsntYn))
            return ih.ui.alert(
              "개인정보 수집 및 이용 동의(삼성화재)를 확인해 주십시오."
            );
          if (ih.util.isEmpty(inParam.pinfoProfrCnsntYn))
            return ih.ui.alert(
              "개인정보 제3자 제공 동의(삼성화재)를 확인해 주십시오."
            );

          ih.fds.callKcbMobileSafe(inParam, callback);
        } else {
          ih.sendRequest("VH.HDFD0003", inParam)
            .then(function (retHDFD0003) {
              ih.debug("■■■■■ FDS INIT [VH.HDFD0003] RESULT!! ::", retHDFD0003);

              if (
                retHDFD0003.result === "S" &&
                !ih.util.isEmpty(retHDFD0003.data.AGREEOPEN)
              ) {
                if ("Y" === retHDFD0003.data.AGREEOPEN) {
                  // 정보동의 공통UI를 사용하기위한 js. 로드[업무단에서 로드, 공통JS 로드시 소스다운로드 완료 타이밍이 안맞아 에러 발생 ]
                  if (ih.agree === undefined) {
                    $.getScript(
                      "/sfmi/v2/ui/common/ih.common.agree.js?_v=" + Date.now()
                    ).done(function () {
                      ih.debug("agree common js Load success!! ");
                    });
                  }
                  // KCB 모바일 안심 플러스 I/F 동의
                  ih.agree.openPopupAgree({
                    pageNumber: "Z_900_000_000", // (필수)페이지넘버
                    dtlBusnSno: "001", // (필수)상세업무일련번호
                    custId: "9999999999",
                    confirmCallback: function (agreeRet) {
                      // (필수)확인콜백(동의확인시실행
                      ih.debug("■■■■■ FDS KCB Agree CallBack :: ", agreeRet);
                      if ("Y" === agreeRet.agreeInfo.mndtAgreeAllYn) {
                        inParam.clasCnsntYn = "Y";
                        inParam.pinfoThptCnsntYn = "Y";
                        inParam.pinfoThptCmucoCnsntYn = "Y";
                        inParam.pinfoColtCnsntYn = "Y";
                        inParam.pinfoProfrCnsntYn = "Y";
                        ih.fds.callKcbMobileSafe(inParam, callback);
                      }
                    },
                  });
                } else {
                  if (callback) callback({ result: "S" });
                }
              } else {
                return ih.ui.alert(
                  "처리 중 오류가 발생했습니다. 잠시후에 다시 이용해  주십시오."
                );
              }
            })
            .catch(function (retHDFD0003) {
              ih.debug(
                "■■■■■ FDS INIT [VH.HDFD0003] Exception!!! ::",
                retHDFD0003
              );
              return ih.ui.alert(
                "처리 중 오류가 발생했습니다. 잠시후에 다시 이용해  주십시오."
              );
            });
        }
      }
    },

    /*
     * KCB 모바일안심플러스 I/F 호출
     *  - VH.HDFD0004 : 동의후 KCB 모바일 안심플러스 I/F 호출 및 결과 저장
     */
    callKcbMobileSafe: function (inParam, callback) {
      var inParamHDFD0004 = {
        fdsBusnScCd: inParam.fdsBusnScCd,
        clasCnsntYn: inParam.clasCnsntYn, // 서비스이용약관동의
        pinfoThptCnsntYn: inParam.pinfoThptCnsntYn, // 개인정보 제3자 제공 동의(KCB)
        pinfoThptCmucoCnsntYn: inParam.pinfoThptCmucoCnsntYn, // 개인정보 제3자 제공 동의(통신사)
        pinfoColtCnsntYn: inParam.pinfoColtCnsntYn, // 개인정보 수집 및 이용 동의(삼성화재)
        pinfoProfrCnsntYn: inParam.pinfoProfrCnsntYn, // 개인정보 제3자 제공 동의(삼성화재)
      };
      // 동의후 KCB 모바일 안심플러스 I/F 호출 및 결과 저장
      ih.sendRequest("VH.HDFD0004", inParamHDFD0004)
        .then(function (retHDFD0004) {
          ih.debug("■■■■■ FDS INIT [VH.HDFD0004] RESULT!!  ::", retHDFD0004);
          if (null != retHDFD0004 && retHDFD0004.result === "S" && callback)
            callback({ result: "S" });
        })
        .catch(function (retHDFD0004) {
          ih.debug("■■■■■ FDS INIT [VH.HDFD0004] Exception!!! ::", retHDFD0004);
        });
    },

    /**
     *  FDS 체크 수행 [ ih.fds.checkFds(inParam, callback) ]
     * @param inParam  FDS 체크 Param ( FDS 업무 관리화면에서 업무별 셋팅 항목 확인 가능 )
     *                   inparam = {
     *                               fdsBusnScCd : '업무구분코드'	// → 업무구분코드 : 필수
     *                             , ...						// → 사용자 입력이 필요한 항목들
     *                             };
     * @param callback 체크 후 callback function
     * @return         FDS 처리 결과
     *                   - rstChkFdsFg  : FDS 체크 성공 여부( true: 성공, false: 실패 )
     *                   - failAddCerti : 추가인증구분코드 [ IH_0033 - 99:대상아님, VA:ARS대상, ID:신분증인증 ]
     *                   - ahntPermList : 추가인증 우선 허용된  구분코드 리스트 (24.06 신분증인증만 나옴. 추후 추가 인증을 대비해서 List 처리)
     */
    checkFds: function (inParam, callback) {
      ih.debug("■■■■■ FDS CHECK START PARAM!! ::", inParam);

      // 필수값체크
      if (!inParam) return ih.ui.alert("입력값을 확인해 주십시오.");
      else if (ih.util.isEmpty(inParam.fdsBusnScCd))
        return ih.ui.alert("업무구분코드를 확인해 주십시오.");
      else if (ih.util.isEmpty(inParam.amount))
        return ih.ui.alert("금액을 확인해 주십시오.");

      ih.debug(
        "■■■■■ VH.HDFD0001 FDS CHECK ih.env.deviceType !! ::",
        ih.env.deviceType
      );
      ih.debug("■■■■■ VH.HDFD0001 FDS CHECK ih.env.os !! ::", ih.env.os);

      /*
       * ih.env.deviceType [ MA:모바일앱, MN:모니모앱, MW:모바일웹, PC:PC ]
       */
      if (ih.env.deviceType === "MN") {
        ih.fds.callMonimoFraud(inParam.fdsBusnScCd, function (data) {
          ih.debug("■■■■■ ih.biz.callMonimoFraud  RESULT :: ", data);
          if (data.result) {
            inParam.prvAgYn = data.prvAgYn;

            // FDS 체크 호출
            ih.sendRequest("VH.HDFD0001", inParam)
              .then(function (ret) {
                ih.debug("■■■■■ FDS CHECK[VH.HDFD0001] RESULT!!  ::", ret);
                if (null != ret && callback) callback(ret);
              })
              .catch(function (ret) {
                ih.debug("■■■■■ FDS CHECK[VH.HDFD0001] Exception!!! ::", ret);
              });
          }
        });
      } else {
        // FDS 체크 호출
        ih.sendRequest("VH.HDFD0001", inParam)
          .then(function (ret) {
            ih.debug("■■■■■ FDS CHECK[VH.HDFD0001] RESULT!!  ::", ret);
            if (null != ret && callback) callback(ret);
          })
          .catch(function (ret) {
            ih.debug("■■■■■ FDS CHECK[VH.HDFD0001] Exception!!! ::", ret);
          });
      }
    },

    /**
     * 명의도용 (약관)정보 요청
     *  - FDS 체크 내부에서 호출되며, FDS체크시 별도 호출 필요 없음
     * ※ 동의 이력이 없는경우 동의 팝업 노출됨
     * - 약관 동의시 응답값 : {prvAgYn : 'Y', result : true}
     * - 약관 동의 취소시 응답값 : {prvAgYn : '', result : false}
     *
     * @param workCls 업무 구분 코드
     * @param callback
     * 				결과 콜백 {prvAgYn : [Y/N], result : [true/false]}
     */
    callMonimoFraud: function (fdsBusnScCd, callback) {
      ih.debug("■■■■■ callMonimoFraud START");

      var rulParam = { fdsBusnScCd: fdsBusnScCd, fdsChkItmCd: ["prvAgYn"] };
      ih.sendRequest("VH.HDFD0002", rulParam)
        .then(function (rst) {
          ih.debug("■■■■■ callMonimoFraud[VH.HDFD0002] result ==>", rst);
          if (rst.prvAgYn === "Y") {
            ih.native.getFraudDetectInfo(function (result) {
              if (callback) {
                callback(
                  result && result.data
                    ? result.data
                    : { result: true, prvAgYn: "N" }
                );
              }
            });
          } else {
            if (callback) callback({ result: true, prvAgYn: "N" });
          }
        })
        .catch(function () {
          inParam.prvAgYn = "N";
          if (callback) callback({ result: true, prvAgYn: "N" });
        });
    },

    /** FDS 추가인증 팝업
     *
     * @param inParam
     * 				- ahntPermList 	: 추가인증 목록
     * 				- mvnoFg		: 알뜰폰여부
     * 				- certParam 	: ARS인증, 신분증 인증 파라메터 정보
     *
     * @param callback
     * 				결과 콜백 {인증결과정보 : Obj, result : [S/F]}
     */
    addCertPopUp: function (inParam, callback) {
      var mvnoFg = inParam.mvnoFg; //알플폰여부
      var ahntPermList = []; //인증가능목록

      var retObj = {};

      var popUpPramObj = {};
      popUpPramObj.certParam = inParam.certParam; //인증 팝업에서 사용할 파라메터

      //알뜰폰인경우
      if (mvnoFg) {
        //알뜰폰인 경우 무조건 신분증 인증으로 변경
        ahntPermList.push("ID");
      } else {
        ahntPermList = inParam.ahntPermList;
      }

      //처리 로직 필요함.
      if (ahntPermList.length == 0) {
        retObj.result = "F";
        callback(retObj);
      }
      //목록이 1개인경우 바로 팝업 호출
      else if (ahntPermList.length == 1) {
        popUpPramObj.athntMthCd = ahntPermList[0];

        //ARS인 경우
        if (ahntPermList[0] == "VA") {
          popUpPramObj.athntMthCd = ahntPermList[0];
          ih.fds.arsCertPopUP(popUpPramObj, callback);
        }
        //신분증인증인 경우
        else if (ahntPermList[0] == "ID") {
          popUpPramObj.athntMthCd = ahntPermList[0];
          ih.fds.idCertPopUP(popUpPramObj, callback);
        }
      } else {
        ih.ui.modalOpen({
          id: "Y_012_000_001",
          link: "/v2/html/modal/Y_012_000_001.html",
          openCallback: function () {
            //ARS 인증
            document
              .querySelectorAll("#Y_012_000_001 #btnCert-11")[0]
              .addEventListener("click", function (event) {
                ih.ui.modalConfirm({ result: "VA" });
              });

            //신분증 인증
            document
              .querySelectorAll("#Y_012_000_001 #btnCert-12")[0]
              .addEventListener("click", function (event) {
                ih.ui.modalConfirm({ result: "ID" });
              });
          },
          callback: function (obj) {
            console.log("----- Y_012_000_001 modalOpen return", obj);

            if (obj != null && obj.result != "" && obj.result != undefined) {
              //ARS인증 인 경우
              if (obj.result == "VA") {
                popUpPramObj.athntMthCd = obj.result;
                ih.fds.arsCertPopUP(popUpPramObj, callback);
              }
              //신분증인증인 경우
              else if (obj.result == "ID") {
                popUpPramObj.athntMthCd = obj.result;
                ih.fds.idCertPopUP(popUpPramObj, callback);
              }
              //callback함수 호출
              else {
                retObj.result = "F";
                callback(retObj);
              }
            }
            //callback함수 호출
            else {
              retObj.result = "F";
              callback(retObj);
            }
          },
        });
      }
    },
    //ARS인증팝업
    arsCertPopUP: function (pramObj, callback) {
      var certParam = pramObj.certParam; //인증팝업파라메터(

      ih.cert.arsAuth(certParam, function (arsCertResult) {
        if (arsCertResult.result == "S") {
          //console.log("arsCertResult===>",arsCertResult);
          arsCertResult.athntMthCd = pramObj.athntMthCd;
          callback(arsCertResult);
        } else {
          var retObj = {};
          retObj.result = "F";
          callback(retObj);
        }
      });
    },
    //신분증 인증 팝업
    idCertPopUP: function (pramObj, callback) {
      var certParam = pramObj.certParam; //인증팝업파라메터(

      ih.cert.idCardAuth(certParam, function (arsCertResult) {
        if (arsCertResult.result == "S") {
          //console.log("arsCertResult===>",arsCertResult);
          arsCertResult.athntMthCd = pramObj.athntMthCd;
          callback(arsCertResult);
        } else {
          var retObj = {};
          retObj.result = "F";
          callback(retObj);
        }
      });
    },
  };
  return self;
})();

/**
 * ih.ui
 */
window.ih.ui = {};
ih.ui = (function () {
  var self = {
    isLoad: false,
    isLoaded: false,
    load: function () {
      if (this.isLoad) return;
      this.isLoad = true;

      if ("P" === ih.getStage()) {
        console.log = function () {};
      }

      ih.debug("load ih.ui");

      // 일부 컨텐츠 팝업과 $plugins.uiAjax 내부적으로 $plugins.uiModalClose을 호출하고 있음
      // New 팝업에서 정상동작하도록 예외 처리 추가
      if (window.MOui && window.$plugins && $plugins.uiModalClose) {
        ih.debug(
          "new 모달 팝업이 정상적으로 동작하기 위해 $plugins.uiModalClose에 예외처리를 적용합니다."
        );
        $plugins.uiModalClose = function (params) {
          var modal = {};
          if (internal._page.modal.length > 0) {
            modal = internal._page.modal[internal._page.modal.length - 1];
            ih.ui.modalClose();
            ih.debug(
              "%c$plugins.uiModalClose을 호출하고 있습니다. ih.ui.modalClose로 변경해 주세요. (" +
                modal.id +
                ":" +
                params.id +
                ")",
              "background:red;color:white"
            );
          } else {
            ih.debug(
              "%c$plugins.uiModalClose을 호출하고 있습니다. 팝업이 아닌곳에서 호출되고 있습니다. 확인이 필요합니다.",
              "background:red;color:white"
            );
          }

          // 주소검색, 직업찾기의 경우 섹션영역을 추가로 닫아줘야 정상동작
          if (params && params.id && params.id == this.sectionId) {
            ih.debug("removeSection을 추가로 호출합니다.");
            this.removeSection(this.sectionId);
            this.sectionId = null;
          }
        }.bind(this);
      }

      var lazyLoadList = [];
      var initFunc = null;
      // 컨텐츠 페이지(HTML파일)인 경우만 지연 로딩처리
      if ("htm,html".indexOf(internal.getUrlExt().toLowerCase()) >= 0) {
        if (
          (ih.env.deviceType === "MN" || ih.env.deviceType === "MA") &&
          !ih.native
        ) {
          lazyLoadList.push("/sfmi/v2/ui/common/ih.native.js");
        }
        if (!ih.log) {
          lazyLoadList.push("/vh/page/VH.HPBZ9001.do");
          lazyLoadList.push("/sfmi/v2/ui/common/ih.common.log.js");
          initFunc = function () {
            ih.log.pageInit();
          }.bind(this);
        }
      }
      /* 
			// JS파일 순차적 로딩 버전 (로딩 순서 보장O)
			if(lazyLoadList.length != 0){
				var loadCount = 0;
				var doNext = function(){
					if(++loadCount == lazyLoadList.length){
						if(typeof initFunc === "function"){
							initFunc();
						}
						ih.debug("load lazy module complated");
						this.isLoaded = true;
					}else{
						$.getScript(lazyLoadList[loadCount]).done(doNext);
					}
				}.bind(this);
				
				$.getScript(lazyLoadList[loadCount]).done(doNext);
			}else{
				this.isLoaded = true;
			}
			*/

      // JS파일 동시 로딩 버전 (로딩 순서 보장X)
      if (lazyLoadList.length != 0) {
        var loadCount = 0;
        lazyLoadList.forEach(
          function (jspath) {
            $.getScript(jspath).done(
              function () {
                if (++loadCount == lazyLoadList.length) {
                  if (typeof initFunc === "function") {
                    initFunc();
                  }
                  ih.debug("load lazy module complated");
                  this.isLoaded = true;
                }
              }.bind(this)
            );
          }.bind(this)
        );
      } else {
        this.isLoaded = true;
      }

      $(document).ready(function () {
        // 웹 접근성 처리(주로 사용하는 언어 명시)
        if (!document.querySelector("html").getAttribute("lang")) {
          if (document.querySelector(".page-company-eng")) {
            document.querySelector("html").setAttribute("lang", "en"); // 회사소개 영문
          } else {
            document.querySelector("html").setAttribute("lang", "ko");
          }
        }

        //FIXME 세션정보 보기 (운영 이관시 코드 제거 必)
        if (
          (ih.getStage() === "L" || ih.getStage() === "D") &&
          $("#h1Tit").length > 0
        ) {
          ih.debug(
            "%c상단 타이틀 클릭 시 세션 정보 보기 기능이 활성화 되었습니다.",
            "background:blue;color:white"
          );
          $("#h1Tit")
            .off("click")
            .on("click", function () {
              ih.ui.modalOpen({ link: "/vh/v2session.jsp", id: "V2SESSION" });
            });
        }
      });

      // FIXME 이전 퍼블에서 모달관련 처리를 위해 ipjs를 호출하는 경우 임시 예외처리 (퍼블 개발 완료 2차오픈 후 제거 必)
      internal.executeAsisCompatibleCode();
    },

    /**
     * 금전거래 모니모 스위치 처리
     *
     * @param tranId 페이지 트랜 ID 또는 url 주소
     * @return 금전거래 모니모 스위치 처리 여부 (true/false)
     */
    monimoSwitch: function (tranId) {
      var url = ih.getTranUrl(tranId);

      var currentMenu = $plugins.page.getMenuInfo(url);
      if (currentMenu != null) {
        /* 금전거래 모니모 스위치 처리 */
        if (currentMenu.monimoSwitch == "Y") {
          ih.ui.alert(currentMenu.switchTit);
          return true;
        }
      }
      return false;
    },

    /**
     * 로딩바 보이기/숨기기
     *
     * (로딩바, 닷로딩바, 프로그레스로딩바)
     *
     * @param visible
     *            로딩바 표시 여부 (숫자 인경우 visible=true 후 해당시간(ms)경과 후 타임아웃 처리
     * @param type (optional)
     * 			  'dot' 닷로딩바, 'progress' 프로그래스 로딩바, 'search' 돋보기 로딩바, 'files' 파일 로딩바,  생략시 기본 로딩바
     *            'full-search' 돋보기 로딩바(전체모드), 'full-files' 파일 로딩바(전체모드)
     * @param message (optional)
     *            프로그래스 로딩바에 표시할 메시지, array로 전달할 경우 메시지 로테이션 됨
     * @param id (optional)
     * 			  생성 위치 (없을 경우 body기준으로 생성)
     */
    loadingTimerId: null,
    loading: function (visible, type, message, id) {
      var clearTimer = function () {
        if (this.loadingTimerId) {
          clearTimeout(this.loadingTimerId);
          this.loadingTimerId = null;
        }
      }.bind(this);

      clearTimer();

      if (window.$plugins) {
        var param = {};
        if (typeof visible === "number") {
          var timeout = visible;
          visible = true;
          this.loadingTimerId = setTimeout(
            function () {
              clearTimer();
              this.loading(false, type);
              ih.debug("loading timeout");
            }.bind(this),
            timeout
          );
        }

        param.visible = visible;
        if (id) {
          param.id = id;
        }
        if (type) {
          if (type.startsWith("full-")) {
            type = type.substring("full-".length);
            param.cls = "fullmode";
          }

          if (type == "search" || type == "files") {
            param.aniItem = "loading-" + type;
          } else {
            param.type = type;
          }
        }

        if (message) {
          param.txt = message;
        }
        return $plugins.uiLoading(param);
      }
    },

    /**
     * 텍스트가 변경되는 로딩화면
     *
     * @as-is rn.loader.lazy
     */
    _loader: null,
    loader: {
      /**
       * 로딩바 보이기
       *
       * @param text
       *            노출되는 초기 문구
       * @param calback (optional)
       *            콜백
       */
      on: function (text, callback) {
        if (!this.isRun()) {
          this._loader = ih.ui.loading(true, "dot", [text]);
        } else {
          this.text(text);
        }

        if (callback) {
          callback();
        }
      },

      /**
       * 로딩바 숨기기
       */
      off: function () {
        if (this.isRun()) {
          ih.ui.loading(false, "dot"); /* 퍼블 스크립트 사용하도록 변경 */
          this._loader = null;
        }
      },

      /**
       * 로딩바에 문구 변경
       * @param text 로딩바에 노출되는 변경할 문구
       *
       */
      text: function (text) {
        if (this.isRun()) {
          this._loader.addText(text);
        }
      },
      /**
       * 로딩바 노출 여부 리턴
       * @return 로딩바 노출시 true, 그외 false
       */
      isRun: function () {
        return $("div.default-loader").length > 0 && this._loader != null;
      },
    },

    /**
     * 스크롤 최상단 이동
     */
    scrollTop: function () {
      try {
        this.execTimer(function () {
          $("html,body").animate({ scrollTop: document.body.scrollHeight });
        }, 0);
      } catch (e) {}
    },

    /**
     * load 이벤트 콜백 등록
     *
     * ※ 팝업 Vue mounted에서 네트워크 요청(sendRequest)이 발생할 경우 해당 콜백에서
     *   처리하도록 적용하세요. (그렇지 않으면 로딩 프로그래스바가 정상적으로 D/P되지 않습니다.)
     *
     * @param callback
     *            콜백 함수
     */
    onload: function (callback) {
      if (internal._page.modal.length > 0) {
        // 팝업 인경우 처리 (팝업 에니메이션이 완전히 종료되고 콜백을 호출하도록 보장함)
        if (typeof callback === "function") {
          var modal = internal._page.modal[internal._page.modal.length - 1];
          if (!ih.util.isEmpty(modal)) {
            if (modal.isOpened && !ih.util.isEmpty(modal.onLoad)) {
              modal.onLoad.forEach(function (cb) {
                if (typeof cb === "function") {
                  cb();
                }
              });
            } else {
              modal.onLoad.push(callback);
            }
          }
        }
      } else {
        // 바닥인 경우 처리 (FIMXE : 왜 사용하는지는 잘 모르겠으나 AS-IS그대로 적용은 해둠)
        window.addEventListener("load", callback);
      }
    },

    /**
     * unload 이벤트 콜백 등록
     *
     * ※ 팝업 결과 콜백에서 바닥페이지 스텝이동을 할경우 퍼블 스크립트에러가 발생함
     *   이런경우 해당 함수 콜백에서 처리하세요.
     *
     *   (PC, 모바일 모두 정상 동작하려면 팝업에 openCallback에서 onunload콜백을 설정해야 정상동작함)
     *
     * @param callback
     *            콜백 함수
     */
    onunload: function (callback) {
      if (internal._page.modal.length > 0) {
        // 팝업 인경우 처리 (팝업이 완전히 닫히고 콜백을 호출하도록 보장함)
        if (typeof callback === "function") {
          var modal = internal._page.modal[internal._page.modal.length - 1];
          if (!ih.util.isEmpty(modal)) {
            if (modal.isClosed && !ih.util.isEmpty(modal.onUnload)) {
              modal.onUnload.forEach(function (cb) {
                if (typeof cb === "function") {
                  cb();
                }
              });
            } else {
              modal.onUnload.push(callback);
            }
          }
        }
      } else {
        // 바닥인 경우 처리
        window.addEventListener("unload", callback);
      }
    },

    /**
     * UI 리소스 버전 정보 리턴
     */
    getResourceVersion: function () {
      return window._ihPage && _ihPage.rver != undefined
        ? _ihPage.rver
        : new Date().getTime();
    },

    /*-----------------------------------------------------------------*/
    /*                                                                 */
    /*                         퍼블 스크립트 래핑	                           */
    /*                                                                 */
    /*-----------------------------------------------------------------*/

    /**
     * 화면 요소에 포커스 보내기 (select 요소도 정상적으로 포커스 처리됨)
     * @param obj 포커스 대상 요소 id값 또는 jquery selector
     * @as-is $plugins.uiFocus
     */
    focus: function (obj) {
      $plugins.uiFocus(obj);
    },

    /**
     * id를 가진 화면 요소에 url 화면을 적용한다.
     *
     * @param id
     *            적용할 화면요소 ID
     * @param url
     *            section URL
     * @param callback
     * 			  콜백함수
     * @param opt
     * 			  옵션값 없을 경우 교체
     *            {prepend: true/false (요소에 prepend처리), add : true/false (요소에 append처리)}
     * @as-is $plugins.uiAjax
     */
    sectionId: null,
    applySection: function (id, url, callback, opt) {
      var that = this;
      var run = function () {
        var option = $.extend(true, {}, opt);
        option.id = id;
        option.url = url;
        option.callback = function (data) {
          if (data) {
            var match = /<section.*id="(?<id>[a-zA-Z0-9\-_]+)"/.exec(data);
            if (null != match && match.groups.id) {
              that.sectionId = match.groups.id;
              console.log("예외처리를 위해 sectionID 저장", that.sectionId);

              $("#" + that.sectionId).addClass("important-active");
            }

            if (callback && typeof callback === "function") {
              callback.apply(null, arguments);
            }
          }
        };
        option.page = true;
        $plugins.uiAjax(option);
      };
      if ($("#" + id).length == 0) {
        var currentCnt = 0;
        var timerId = setInterval(function () {
          if ($("#" + id).length > 0 || ++currentCnt > 20) {
            console.log(
              "lazycall for applySection",
              $("#" + id).length,
              currentCnt
            );
            clearInterval(timerId);
            run();
          }
        }, 100);
      } else {
        run();
      }
    },

    /**
     * applySection으로 생성한 화면 요소를 제거한다.
     *
     * @param id
     *            제거할 화면요소 ID
     * @as-is $plugins.uiModalClose
     */
    removeSection: function (id) {
      if (window.MOui) {
        if (
          $("#" + id)[0] &&
          $("#" + id)[0].uiComponents &&
          $("#" + id)[0].uiComponents.modal
        ) {
          // Note : 일부 개발자들이 applySection -> modalOpen 전환과정에서 removeSection을 modalClose로 변경하지 않은 경우가 있어
          // 예외 처리 추가함. 잘못 호출되었지만 정상적으로 닫기도록 적용
          ih.debug(
            "%cih.ui.removeSection을 팝업닫기에 잘못 사용하고 있습니다. ih.ui.modalClose로 변경해 주세요.",
            "background:red;color:white"
          );
          MOui.modal("#" + id).hide();
        } else {
          $("#" + id).remove();
        }
      } else {
        $plugins.uiModalClose({ id: id, remove: true });
      }
    },

    /**
     * 아코디언 요소 초기화
     * @param opt
     * 				옵션값
     * 				{id: 아코디언 요소 ID값, autoclose: true/false(새로운 아코디언 메뉴 확장시 기존 요소 자동으로 닫을지 여부)}
     * @as-is $plugins.uiAccordion
     */
    accordion: function (opt) {
      $plugins.uiAccordion(opt);
    },

    /**
     * 아코디언 요소 확장
     *
     * @param opt
     *            옵션값 {id: 아코디언 요소ID값, current: 확장할 아코디언 인덱스 배열}
     * @as-is $plugins.uiAccordionBox
     */
    accordionBox: function (opt) {
      $plugins.uiAccordionBox.apply(null, arguments);
    },

    //		/**
    //		 *  결과창 에니메이션 실행
    //		 */
    //		resultAnimation : function(){
    //			$plugins.uiResultAnimation.apply(null, arguments);
    //		},

    /**
     * 단 방향 슬라이드 컴포넌트 초기화 작업 수행
     */
    nextSlide: function () {
      $plugins.uiNextSlide.apply(null, arguments);
    },

    /**
     * 스텝 프로세스 이동
     *
     * @param opt
     *            옵션값 {id: 스텝 영역 ID값, current: 노출할 스텝 index}
     * @as-is $plugins.uiPageStep
     */
    pageStep: function (opt) {
      $plugins.uiPageStep.apply(null, arguments);
    },

    /**
     * 스텝 프로세스 이동
     *
     * @param opt
     *            옵션값 {id: 스텝 영역 ID값, move:이동방향 [next|prev], callback:결과콜백,
     *            effect:전환효과}
     * @as-is $plugins.uiPageStepSlide
     */
    // @deprecated ih.ui.showSlideStep 으로 변경해주세요.!!
    pageStepSlide: function (opt) {
      // 2024.04.04 퍼블 스크립트 변경사항 반영 ($plugins.uiPageStep -> MOui.step)
      ih.debug(
        "퍼블 공통함수가 변경되었습니다. ih.ui.showSlideStep로 변경해 주세요."
      );
      return ih.ui.showSlideStep("#" + opt.id, opt.move);
    },

    /**
     *
     * 스텝 프로세스 이동
     *
     * @param selector
     *            쿼리 셀렉터
     * @param action
     *            'next'(다음), 'prev'(이전), {index}(0인덱스), {element}(요소)
     * @param noHist
     * 			   히스토리 스택 적재 여부 (true/false)
     * 			   내부적으로 히스토리 스택을 쌓지 않고 navigation.back() 처리 수행함 ('prev' 액션일때는 true값 강제 적용됨)
     *
     * @as-is $plugins.uiPageStepSlide
     *
     * ex) ih.ui.showSlideStep('#uiStep', "next"); // 다음 스텝으로 이동
     *     ih.ui.showSlideStep('#uiStep', "2");	   // 3번째 스텝화면으로 이동
     *
     * [스텝 이동 이벤트]
     * - 스텝 이동 시작 전 이벤트 : stepElement.addEventListener('stepChangeBefore', function(e){console.log(e.detail)});
     * - 스텝 이동 완료 후 이벤트 : stepElement.addEventListener('stepChangeAfter', function(e){console.log(e.detail)});
     */
    showSlideStep: function (selector, action, noHist) {
      var eventTarget = document.querySelector(selector);
      if (null != eventTarget && ih.env.deviceType != "PC") {
        var listener = function (e) {
          try {
            ih.debug("stepChangeBefore", e.detail);
            if (
              e.detail &&
              e.detail.length == 3 &&
              null != e.detail[2].querySelector(".section.option-result")
            ) {
              $("#baseHeader").css("display", "none");
            } else if ($("#baseHeader").css("display") == "none") {
              $("#baseHeader").css("display", "block");
            }
            eventTarget.removeEventListener("stepChangeBefore", listener);
          } catch (e) {
            console.error("stepChangeBefore 이벤트 처리 중 오류 발생", e);
          }
        };
        eventTarget.addEventListener("stepChangeBefore", listener);
      }

      if ("prev" === action) {
        return MOui.step(selector).showSlideStep(action, true); // 히스토리 스택을 쌓지 않고 navigation.back()처리
      } else {
        return MOui.step(selector).showSlideStep(action, noHist);
      }
    },

    /**
     * 탭 활성화
     *
     * @param opt
     *            옵션값 {id:탭 영역 ID, current:활성화할 탭 인덱스}
     * @as-is $plugins.tab
     */
    tab: function (opt) {
      $plugins.uiTab.apply(null, arguments);
    },

    /**
     * 체크박스 전체 체크
     *
     * @param opt
     *            옵션값 {id:체크박스 ID, callback:결과콜백}
     * @as-is $plugins.uiAllcheck
     */
    allcheck: function (opt) {
      $plugins.uiAllcheck.apply(null, arguments);
    },

    /**
     * 날짜 선택 팝업
     * @param opt
     * 			옵션값 {id: 데이터피커ID, callback:결과콜백}
     */
    datepicker: function (opt) {
      $plugins.uiDatepicker.apply(null, arguments);
    },

    /**
     * Range Slider data-graph-bar에 적용한 수치로 에니메이션을 수행
     */
    sliderGraph: function () {
      $plugins.uiSliderGraph.apply(null, arguments);
    },

    /*-----------------------------------------------------------------*/
    /*                                                                 */
    /*                       팝업 관련 function                           */
    /*                                                                 */
    /*-----------------------------------------------------------------*/

    /**
     * alert 팝업 열기
     *
     * @param message
     *            메시지
     * @param callback
     *            완료 콜백
     * @param opt
     *            옵션 {confirmButton:'확인 버튼명 변경: 확인(기본값)', type : ["0"(없음)|"1"(알림)|"2"(선택(기본값))|"3"(확인)|"4"(오류)], endFocusId:완료 시 포커스 이동할 요소 ID, bgClose : true/false(dim 클릭 시 닫힘 여부, 기본값 true)}
     */
    alert: function (message, callback, opt) {
      var type = null;
      if (ih.util.isEmpty(opt)) {
        opt = {};
      }
      message = ih.util.replaceAll(message, "\n", "<br>");

      if (window.MOui) {
        // New 팝업 적용
        ih.debug("신규 알럿을 사용합니다.");
        var param = {
          text: message,
          ok: opt.confirmButton,
        };
        var option = {
          type: opt.type,
          endFocus: opt.endFocusId,
          bgClose: opt.bgClose,
        };

        MOui.modal.alert(param, option).then(function () {
          if (callback) {
            callback();
          }
        });
      } else {
        // AS-IS 팝업
        ih.debug("기존 알럿을 사용합니다.");
        top.$plugins.modal.alert(
          message,
          function () {
            if (callback) {
              callback();
            }
            return;
          },
          opt.confirmButton,
          opt.type,
          opt.size,
          opt.zidx,
          opt.endFocusId
        );
      }
    },

    /**
     * 확인 팝업 열기
     *
     * @praram message : 확인 메시지
     * @param callback :
     *            완료 콜백
     * @praram opt : 옵션 {confirmButtonName(확인 버튼명 변경: 기본값(확인), cancelButtonName(취소 버튼명 변경: 기본값(취소)), type :["0"(없음)|"1"(알림)|"2"(선택(기본값))|"3"(확인)|"4"(오류)], endFocusId:완료 시 포커스 이동할 요소 ID,
     *         bgClose : true/false(dim 클릭 시 닫힘 여부, 기본값 true)}
     */
    confirm: function (message, callback, opt) {
      if (ih.util.isEmpty(opt)) {
        opt = {};
      }
      message = ih.util.replaceAll(message, "\n", "<br>");

      if (window.MOui) {
        // New 팝업 적용
        ih.debug("신규 컨펌을 사용합니다.");
        var param = {
          text: message,
          ok: opt.confirmButtonName,
          cancel: opt.cancelButtonName,
        };
        var option = {
          type: opt.type,
          endFocus: opt.endFocusId,
          bgClose: opt.bgClose,
        };

        MOui.modal.confirm(param, option).then(
          function (resolve) {
            // 확인
            if (callback) {
              callback(true);
            }
          },
          function (resolve) {
            // 닫기
            if (callback) {
              callback(false);
            }
          }
        );
      } else {
        // AS-IS 팝업
        ih.debug("기존 컨펌을 사용합니다.");
        top.$plugins.modal.confirm(
          message,
          function () {
            //self.focus();
            if (callback) {
              callback(true);
            }
            return;
          },
          function () {
            //self.focus();
            if (callback) {
              callback(false);
            }
            return;
          },
          opt.confirmButtonName,
          opt.cancelButtonName,
          opt.type,
          opt.size,
          opt.zidx,
          opt.callback,
          opt.endFocusId
        );
      }
    },

    /**
     * 모달팝업 열기
     *
     * @param opts
     *            옵션 {pageId(페이지Id), link(url), param(파라미터), callback, ps, full, half, openCallback, closeCallback, bgClose : true/false(dim 클릭 시 닫힘 여부, 기본값 true)}
     *            pageId 또는 link 둘중 하나는 반드시 필수
     */
    modalOpen: function (opts) {
      if (!this.isLoaded) {
        ih.debug("[MODAL] waiting...");
        setTimeout(
          function () {
            this.modalOpen(opts);
          }.bind(this),
          500
        );
        return;
      }

      if (typeof window.Vue === "function") {
        this._modalOpen(opts);
      } else {
        // 바닥페이지(ex. HTML 컨텐츠)에서 Vue.js을 로딩하지 않았을 경우 예외처리 추가
        $.getScript("/v2/resources/js/vue.min.js").done(
          function () {
            ih.debug("[MODAL] load vue.js");
            if (window.ih && ih.log) ih.log.pageInit(); //IH.LOG 04.18 Vue 로딩시 초기화함수 추가 Call
            this._modalOpen(opts);
          }.bind(this)
        );
      }
    },
    _modalOpen: function (opts) {
      opts = opts || {}; /*{pageId : , link : , param : , callback :	}*/

      if (!opts.pageId && typeof opts.link !== "string") {
        ih.debug("[MODAL] pageId 또는 link 중 하나는 필수로 입력해야됩니다.");
        return;
      }

      var modalOption = {};
      modalOption.link = ih.getTranUrl(opts.pageId ? opts.pageId : opts.link);
      modalOption.link +=
        (modalOption.link.indexOf("?") >= 0 ? "&" : "?") +
        "_v=" +
        ih.ui.getResourceVersion();
      var exec = /\/(?<name>[a-zA-Z0-9\._]*)\.(do|html|htm){1}/.exec(
        modalOption.link
      );
      var id = exec && exec.groups.name ? exec.groups.name : opts.pageId;
      id = id ? id : opts.id;
      //modalOption.id = id.replaceAll('.', '\\.');
      modalOption.id = id ? id : opts.id;

      // 중복팝업 방지
      if (
        !ih.util.isEmpty(
          internal._page.modal.filter(function (obj) {
            return obj.id == id;
          })
        )
      ) {
        ih.debug("[MODAL] 중복 팝업 무시 : " + id);
        return;
      }

      ih.util.isEmpty(opts.full)
        ? (modalOption.full = true)
        : (modalOption.full = opts.full);
      ih.util.isEmpty(opts.ps)
        ? (modalOption.ps = "bottom")
        : (modalOption.full = opts.ps);
      ih.util.isEmpty(opts.half)
        ? (modalOption.half = false)
        : (modalOption.half = opts.half);

      // 팝업이 떠있는 상태에서 H/W back로 스텝이동시 팝업이 종료되지 않아 예외처리 추가함
      var stepElement = document.querySelector("div[fui-step]");
      var stepListener = function (e) {
        if (null != stepElement) {
          try {
            // 24.10.18 퍼블 공통에서 처리하도록 변경됨
            //						ih.debug('[MODAL] stepChangeBefore: 스텝 이동으로 팝업을 강제로 종료합니다.');
            //						ih.ui.modalClose();
            stepElement.removeEventListener("stepChangeBefore", stepListener);
          } catch (e) {
            console.error(
              "[MODAL] modalOpen.stepChangeBefore 이벤트 처리 중 오류 발생",
              e
            );
          }
        }
      };
      if (null != stepElement) {
        stepElement.addEventListener("stepChangeBefore", stepListener);
      }

      var openCallback = function () {
        if (window.ih && ih.log) {
          ih.log.pageInit(); //IH.LOG 05.14 Vue 로딩시 초기화함수 추가 Call - (For HTML 팝업페이지 로깅)
        }

        var modal = internal._page.modal.filter(function (obj) {
          return obj.id == modalOption.id;
        });

        // 오픈 콜백 함수가 등록된 경우 호출
        if (opts.openCallback) {
          opts.openCallback();
        }

        // 팝업 onLoad 이벤트 처리
        if (!ih.util.isEmpty(modal)) {
          modal[0].isOpened = true;
          if (!ih.util.isEmpty(modal[0].onLoad)) {
            modal[0].onLoad.forEach(function (cb) {
              if (typeof cb === "function") {
                if (window.Vue) {
                  Vue.nextTick(cb);
                } else {
                  setTimeout(cb, 100);
                }
              }
            });
          }
        }

        /**
         * 팝업 보안키보드/키패드 필드 적용
         */
        ih.rescanNOS(modalOption.id);
      };

      var closeCallback = function (result) {
        // step 리스너 해제
        if (null != stepElement) {
          ih.debug("[MODAL] ModalClose:스텝리스너를 해제합니다.");
          stepElement.removeEventListener("stepChangeBefore", stepListener);
        }

        var closedModal = internal._page.modal.filter(function (obj) {
          return obj.id == modalOption.id;
        });
        if (!ih.util.isEmpty(internal._page.modal)) {
          internal._page.modal = internal._page.modal.filter(function (obj) {
            return obj.id != modalOption.id;
          });
        }

        if ("error" == result) {
          return;
        }

        // 팝업 onUnload 이벤트 처리
        if (!ih.util.isEmpty(closedModal)) {
          closedModal[0].isClosed = true;
          if (!ih.util.isEmpty(closedModal[0].onUnload)) {
            closedModal[0].onUnload.forEach(function (cb) {
              if (typeof cb === "function") {
                if (window.Vue) {
                  Vue.nextTick(cb);
                } else {
                  setTimeout(cb, 100);
                }
              }
            });
          }
        }

        if (opts.closeCallback) {
          var _closeTimerId = setTimeout(function () {
            opts.closeCallback();
            clearTimeout(_closeTimerId);
          }, 500);
        }
      };

      var pageInfo = {
        id: id,
        data: opts.param || {},
        callback: opts.callback || undefined,
        url: modalOption.link || undefined,
        isOpened: false,
        isClosed: false,
        onLoad: [],
        onUnload: [],
      };

      internal._page.modal.push(pageInfo);

      if (window.MOui) {
        ih.debug("[MODAL] 신규 팝업 열기를 사용합니다.");

        MOui.callLayer({
          url: modalOption.link,
          id: modalOption.id,
          showFn: function (el) {
            // 팝업 열기 에니메이션 전에 호출됨
            ih.debug("[MODAL] [Pop_" + modalOption.id + "] show", el);
          },
          hideFn: function (el) {
            // 팝업 닫기 에니메이션 종료 후에 호출됨
            ih.debug("[MODAL] [Pop_" + modalOption.id + "] hide", el);

            closeCallback();
          },
          bgClose: opts.bgClose,
        }).then(function (el) {
          // 팝업 열기 에니메이션 종료 후에 호출됨
          ih.debug("[MODAL] [Pop_" + modalOption.id + "] openCallback", el);

          if (el && el.id != modalOption.id) {
            console.log(
              "[MODAL] 팝업 ID 추가 : (" + modalOption.id + ", " + el.id + ")"
            );
            el.setAttribute("popId", modalOption.id);
          }

          if (null !== el) {
            openCallback();
          } else {
            ih.debug("[MODAL] 팝업 열기 실패");
            closeCallback("error");
          }
        });
      } else {
        ih.debug("[MODAL] 기존 팝업 열기를 사용합니다.");

        modalOption.callback = openCallback;
        modalOption.closecallback = closeCallback;

        $plugins.uiModal(modalOption);
      }
    },

    /**
     * 모달팝업 호출 파라미터 조회
     *
     * @param pageId (optional)
     *            페이지 트랜 ID 또는 HTML 파일명 (누락시 현재 최상위 모달팝업 데이터 전달)
     */
    getModalParam: function () {
      var pageId = null;
      if (ih.util.isEmpty(pageId) && internal._page.modal.length > 0) {
        pageId = internal._page.modal[internal._page.modal.length - 1].id;
      }
      if (pageId) {
        var modal = internal._page.modal.filter(function (obj) {
          return obj.id == pageId;
        });
        if (!ih.util.isEmpty(modal) && modal[0].data) {
          return modal[0].data;
        }
      }
      return {};
    },

    /**
     * 모달팝업 닫기 처리
     *
     * @param pageId (optional)
     *            페이지 트랜 ID 또는 HTML 파일명 (누락시 현재 최상위 모달팝업 닫기처리)
     */
    modalClose: function (forceRemove) {
      var pageId = null;
      if (ih.util.isEmpty(pageId) && internal._page.modal.length > 0) {
        pageId = internal._page.modal[internal._page.modal.length - 1].id;
      }
      if (pageId) {
        if (typeof forceRemove === "boolean" && forceRemove) {
          internal._page.modal = internal._page.modal.filter(function (obj) {
            return obj.id != pageId;
          });
        }
        if (window.MOui) {
          ih.debug("[MODAL] 신규 팝업 닫기를 사용합니다.");
          var popElement =
            $("#" + pageId).length > 0
              ? $("#" + pageId)
              : $("[popid='" + pageId + "']");
          MOui.modal(popElement[0])
            .hide()
            .then(function () {
              ih.debug("[MODAL] 신규 팝업 닫기 완료");
            });
        } else {
          ih.debug("[MODAL] 기존 팝업 닫기를 사용합니다.");
          $plugins.uiModalClose({
            id: pageId.replace(".", "\\."),
            remove: true,
          });
        }
      } else {
        if (this.sectionId) {
          ih.debug("[MODAL] 모달팝업 닫기 예외처리", this.sectionId);
          this.removeSection(this.sectionId);
          this.sectionId = null;
        } else {
          ih.debug("[MODAL] 모달팝업 닫기 실패", pageId);
        }
      }
    },

    /**
     * 모달팝업 확인 처리
     *
     * @param result
     *            모달팝업 호출 결과값
     * @param pageId (optional)
     *            페이지 트랜 ID 또는 HTML 파일명 (누락시 현재 최상위 모달팝업 결과값 전달)
     */
    modalConfirm: function (result, forceRemove) {
      var pageId = null;
      if (ih.util.isEmpty(pageId) && internal._page.modal.length > 0) {
        pageId = internal._page.modal[internal._page.modal.length - 1].id;
      }
      if (pageId) {
        var callback = null;
        var modal = internal._page.modal.filter(function (obj) {
          return obj.id == pageId;
        });
        if (!ih.util.isEmpty(modal) && modal[0].callback) {
          callback = modal[0].callback;
        }
        this.modalClose(forceRemove);
        if (callback) {
          callback(result);
        }
      } else {
        if (this.sectionId) {
          ih.debug("[MODAL] 모달팝업 확인 예외처리", this.sectionId);
          this.removeSection(this.sectionId);
          this.sectionId = null;
        } else {
          ih.debug("[MODAL] 모달팝업 확인 처리 실패", pageId);
        }
      }
    },

    /**
     * 카카오 알림톡발송 팝업 호출
     *
     * @param data
     *            팝업 데이터 {title:제목(기본값:'알림톡'), subtitle:부제(기본값:'')}
     * @param callback
     *            완료 콜백 result {mobileNo:팝업에서 입력한 전화번호}
     */
    openKakaoSendPop: function (data, callback) {
      this.modalOpen({
        pageId: "VH.HPBZ0004",
        param: data,
        callback: function (result) {
          ih.debug("[MODAL] openKakaoSendPop result", result);
          if (callback) {
            callback(result);
          }
        },
      });
    },

    /**
     * 우편번호 검색 팝업 호출
     *
     * @param data
     *            팝업 데이터 {searchKey:검색어(기본값:''), detailMandatory:상세주소 필수여부(기본값:true)}
     * @param callback
     *            완료 콜백 result {mobileNo:팝업에서 입력한 전화번호}
     */
    openZipcodeSearchPop: function (data, callback) {
      this.modalOpen({
        pageId: "VH.HPBZ0002",
        param: data,
        callback: function (result) {
          ih.debug("[MODAL] openZipcodeSearchPop result", result);
          if (callback) {
            callback(result);
          }
        },
      });
    },

    /**
     * 서류 등록 팝업 호출
     *
     * @param data
     *            팝업 데이터 {
     *            		title: 팝업 타이틀 (기본값 '서류 등록')
     *            		qrShow : QR스캔 노출 여부 (기본값 false)
     *            		imgMaxSize: 이미지 MAX SIZE (기본값: String(15 * 1024 *1024)),
     *                  imgAllowedType: 이미지 허용 확장자 (기본값: ['jpg', 'jpeg', 'png']),
     *                  imgLimitCnt : 이미지 MAX Count (기본값 : '5'),
     *                  pdfMaxSize: PDF MAX SIZE (기본값: String(15 * 1024 *1024)),
     *                  pdfAllowedType: PDF 허용 확장자 (기본값: ['pdf']),
     *                  pdfLimitCnt : PDF MAX Count (기본값 : '5'),
     *            }
     * @param callback
     *            완료 콜백 result [
     *            	{
     *            		fileName : 채번된 파일명 (ex. IMG20240823140601817.jpg),
     *            		fileType : 파일 타입 (확장자) (ex. pdf, jpg),
     *            		base64data : 파일 base64 인코딩 데이터 (ex. data:image/jpeg;base64,/9j/4RAARXhpZgAATU0AKgAAAA...),
     *            		originFileName : 실제 선택한 파일명 (ex. aaa.jpg"),
     *            		data : 파일 blob 데이터
     *              },
     *              ...
     *            ]
     */
    openRegDocPop: function (data, callback) {
      this.modalOpen({
        pageId: "VH.HPBZ0012",
        param: data,
        callback: function (result) {
          ih.debug("[MODAL] openRegDocPop result", result);
          if (callback) {
            callback(result);
          }
        },
      });
    },

    /**
     * 사진확인 팝업
     *
     * @param data
     *            팝업 데이터 {
     *            		title: 팝업 타이틀 (옵션 : 기본값 '사진 확인'),
     *            		imageSrcUrl: 이미지 url
     *            }
     * @param openCallback
     * 			  팝업 오픈 콜백
     * @param closeCallback
     * 			  팝업 닫기 콜백
     * @param callback
     *            완료 콜백 (현재 사용되지 않음)
     *
     */
    openImgPreviewPop: function (data, openCallback, closeCallback, callback) {
      this.modalOpen({
        pageId: "VH.HPBZ0013",
        param: data,
        openCallback: openCallback,
        closeCallback: closeCallback,
        callback: function (result) {
          ih.debug("[MODAL] openImgPreviewPop result", result);
          if (callback) {
            callback(result);
          }
        },
      });
    },

    /**
     * 직업찾기 검색 팝업 호출
     *
     * @param data
     *            팝업 데이터 {insrJobDt:직업코드기준일자}
     * @param callback
     *            완료 콜백 result {injryRskGrdCd03:직업상해급수, insrJobCd:직업코드, insrJobNm:직업명}
     */
    openJobSearchPop: function (data, callback) {
      ih.ui.modalOpen({
        pageId: "VH.HPBZ0011",
        param: data,
        callback: function (result) {
          ih.debug("[MODAL] openJobSearchPop result", result);
          if (callback) {
            callback(result);
          }
        },
      });
    },

    /**
     * 오즈 뷰어/PDF 팝업 호출
     *
     * 1. 오즈뷰어를 위한 iframe 레이아웃 제공 (layout-id:'printPreview'), (ozviewer:true (기본값))
     *
     * 라이브러리 로딩(/OZServer/js/TPSServiceRequest_h5_direct.js)
     * 및 스크립트 호출(setSOAPMessgeParam_hash - ERP에 출력데이터 요청(SOAP방식-PI연계)을 위한 파라미터 세팅
     *				preEmbedWithParams_pkchk - 모니모 관련 임베디드함수 추가
     *				setSOAPMessgeParam_hash - unet 암호 처리 함수
     *				setXMLData_hash() - 추가, unet 암호 처리 함수
     * )은 바닥(업무) 페이지에서 처리
     *
     * 2. PDF뷰어를 위한 iframe 레이아웃 제공 (layout-id:'pdfPreview'), (ozviewer:false)
     *
     * @param data
     *            팝업 데이터 {
     *            			title : 팝업 타이틀(옵션),
     *            			timeout : 로팅 타임아웃값 (옵션: 생략시 기본값 10초)
     *            			ozviewer : oz뷰어 모드 여부 [true(생략시 기본값)|false]
     *            			src : pdf파일 경로 (ozviewer:false인경우만 유효)
     *                      secondarytoolbar : 더보기 툴바 노출 여부 (생략시 기본값 비활성화(false), ozviewer:false인경우만 유효)
     *                      pageNumber : 페이지 No (생략시 기본값 '1', ozviewer:false인경우만 유효)
     *            }
     * @param openCallback
     * 			  팝업 오픈 콜백 : 라이브러리 초기화 작업 수행
     * @param closeCallback
     * 			  팝업 닫기 콜백
     * @param callback
     *            완료 콜백 (현재 사용되지 않음)
     */
    openOzViewerPop: function (data, openCallback, closeCallback, callback) {
      ih.ui.modalOpen({
        pageId: "VH.HPBZ0020",
        param: data,
        openCallback: openCallback,
        closeCallback: closeCallback,
        callback: function (result) {
          ih.debug("[MODAL] openOzViewerPop result", result);
          if (callback) {
            callback(result);
          }
        },
      });
    },

    /**
     * PDF 뷰어 팝업 호출
     *
     * PDF뷰어를 위한 iframe 레이아웃 제공 (layout-id:'pdfPreview')
     * PDF뷰어 라이브러리 경로(/sfmi/v2/resources/lib/pdfviewer/)
     *
     * @param data
     *            팝업 데이터 {
     *            			src : PDF URL 경로 (cross 도메인 경로는 지원하지 않음)
     *            			title : 팝업 타이틀(옵션),
     *            			timeout : 로팅 타임아웃값 (옵션: 생략시 기본값 10초)
     *            }
     * @param openCallback
     * 			  팝업 오픈 콜백
     * @param closeCallback
     * 			  팝업 닫기 콜백
     * @param callback
     *            완료 콜백 (현재 사용되지 않음)
     */
    openPdfViewerPop: function (data, openCallback, closeCallback, callback) {
      if (data) {
        data.ozviewer = false;
      }
      ih.ui.modalOpen({
        pageId: "VH.HPBZ0020",
        param: data,
        openCallback: openCallback,
        closeCallback: closeCallback,
        callback: function (result) {
          ih.debug("[MODAL] openPdfViewerPop result", result);
          if (callback) {
            callback(result);
          }
        },
      });
    },

    /**
     * QR 스캔 화면 호출 (Native)
     *
     * 유비케어 SDK를 통해 QR 스캔하여 이미지 정보로 전환 및 전달
     *
     * @param callback 결과값을 전달받을 콜백
     * 				data : {
     * 					errCode(String) : "0"(성공) / "1"(오류) / "2"(취소),
     *					base64ImageData : (BinaryData)
     * 				}
     */
    openQrScan: function (callback) {
      if (ih.env.deviceType === "MN" || ih.env.deviceType === "MA") {
        ih.native.openQrScan(callback);
      } else {
        this.alert("QR 스캔은 앱에서만 지원합니다.");
      }
    },

    /**
     * 전화걸기
     *
     * @param callTelNo
     *            전화번호
     */
    openCallApp: function (callTelNo) {
      callTelNo = ih.util.replaceAll(callTelNo, "-", "");
      if (ih.env.deviceType === "MN") {
        ih.native.openCallApp(callTelNo);
      } else if (ih.env.deviceType === "MW" || ih.env.deviceType === "MA") {
        location.href = "tel://" + callTelNo;
      } else {
        this.alert("전화걸기는 모바일만 지원합니다.");
      }
    },

    // ih.fds.callMonimoFraud 함수로 변경됨 (2024.11.12)
    //		/**
    //		 * 명의도용 (약관)정보 요청
    //		 *
    //		 * ※ 동의 이력이 없는경우 동의 팝업 노출됨
    //		 * - 약관 동의시 응답값 : {prvAgYn : 'Y', result : true}
    //		 * - 약관 동의 취소시 응답값 : {prvAgYn : '', result : false}
    //		 *
    //		 * @param workCls 업무 구분 코드
    //		 * @param callback
    //		 * 				결과 콜백 {prvAgYn : [Y/N], result : [true/false]}
    //		 */
    //		getFraudDetectInfo : function(workCls, callback){
    //			if(ih.env.deviceType === "MN"){
    //				ih.sendRequest("VH.HDBZ0015", {workCls : workCls}).then(function(fds){
    //					if(fds.fakeFinder == 'Y') {
    //						ih.native.getFraudDetectInfo(function(result){
    //							if(callback){
    //								callback(result && result.data ? result.data : {result: true, prvAgYn: 'N'});
    //							}
    //						});
    //					}else{
    //						if(callback){
    //							callback({prvAgYn:'N', result:true});
    //						}
    //					}
    //				}).catch(function(){
    //					if(callback){
    //						callback({prvAgYn:'N', result:false});
    //					}
    //				});
    //			}else{
    //				ih.debug("명의도용 (약관)정보 요청은 모니모에서만 지원합니다.");
    //			}
    //		},

    /*-----------------------------------------------------------------*/
    /*                                                                 */
    /*                       페이지 처리 관련 function                      */
    /*                                                                 */
    /*-----------------------------------------------------------------*/

    /**
     * 홈으로 이동
     *
     * @param data
     *            페이지 데이터
     */
    goHome: function (data) {
      if (internal.isHome()) {
        // 이미 홈화면인경우 reload처리
        location.reload();
      } else if (internal.isHome(document.referrer)) {
        // 이전 스택이 home인 경우 히스토리 back
        //history.back(); // 퍼블스크립트로 인해 홈 이동 팝업이 나옴
        ih.ui.movetoPage(internal.getHomeUrl());
      } else {
        // 홈화면으로 이동 처리
        if (ih.env.deviceType === "MN") {
          ih.native.closeCurBrowser();
        } else {
          if (ih.env.deviceType === "MA" && ih.env.os === "Android") {
            ih.native.closeCurBrowser();
          } else {
            ih.ui.movetoPage(internal.getHomeUrl());
          }
        }
      }
    },

    /**
     * 홈화면 여부 리턴
     *
     * @return 홈화면인경우 true, 아닌경우 false 리턴
     */
    isHome: function () {
      return internal.isHome();
    },

    /**
     * 페이지 이동
     *
     * @param pageId
     *            페이지 트랜 ID 또는 url 주소
     * @param data
     *            페이지 데이터 Object
     * @param post
     * 			  post호출 여부 true/false (optional)
     */
    gotoPage: function (pageId, data, post) {
      var url = ih.getTranUrl(pageId);
      if (post && data) {
        $("form[name=goToPageForm]").remove();
        var goForm = $("<form></form>");
        goForm.attr("name", "goToPageForm");
        goForm.attr("method", "post");
        goForm.attr("action", url);
        var keys = Object.keys(data);
        goForm.append(
          $("<input/>", {
            type: "hidden",
            name: "_v",
            value: ih.ui.getResourceVersion(),
          })
        );
        for (var i = 0; i < keys.length; i++) {
          var param =
            typeof data[keys[i]] === "object"
              ? "encode_" + ih.util.base64.encode(JSON.stringify(data[keys[i]]))
              : data[keys[i]];
          goForm.append(
            $("<input/>", { type: "hidden", name: keys[i], value: param })
          );
        }
        goForm.appendTo("body");
        goForm.submit();
      } else {
        var params = ih.util.objectToUrlParams(data);
        location.href =
          url +
          (url.indexOf("?") >= 0 ? "&" : "?") +
          "_v=" +
          ih.ui.getResourceVersion() +
          (params ? "&" + params : "");
      }
    },

    /**
     * 페이지 변경 (history stack에 추가되지 않고 현재 페이지 교체)
     *
     * @param pageId
     *            페이지 트랜 ID 또는 url 주소
     * @param data
     *            페이지 데이터 Object
     */
    movetoPage: function (pageId, data) {
      var params = ih.util.objectToUrlParams(data);
      var url = ih.getTranUrl(pageId);
      location.replace(
        url +
          (url.indexOf("?") >= 0 ? "&" : "?") +
          "_v=" +
          ih.ui.getResourceVersion() +
          (params ? "&" + params : "")
      );
    },

    /**
     * 페이지 호출 파라미터 조회
     *
     * @returns 페이지 호출 파라미터 리턴
     */
    getPageParam: function () {
      var params = {};
      if (window._ihPage && _ihPage.params) {
        try {
          var obj = JSON.parse(
            _ihPage.params.replaceAll("&#034;", '"').replaceAll("&#039;", "'")
          );
          var keys = Object.keys(obj);
          var ignorelist = [
            "_v",
            "screenId",
            "pageNumber",
            "useOldCssYN",
            "e2eYN",
            "certYN",
          ];
          for (var i = 0; i < keys.length; i++) {
            if (
              obj[keys[i]] &&
              obj[keys[i]][0] &&
              !ih.util.contains(ignorelist, keys[i])
            ) {
              params[keys[i]] = obj[keys[i]][0].startsWith("encode_")
                ? JSON.parse(
                    ih.util.base64.decode(
                      ih.util.replaceAll(obj[keys[i]][0].substring(7), " ", "+")
                    )
                  )
                : obj[keys[i]][0];
            }
          }
          return params;
        } catch (e) {
          ih.debug("[getPageParam] exception occurred", e);
        }
      }
      return ih.util.urlParamsToObject(location.search);
    },

    /**
     * 새창열기
     *
     * 모니모/삼성화재 앱 : 새창열기 bridge 호출, 그외 window.open
     *
     * @param pageId
     *            페이지 트랜 ID 또는 url 주소
     * @param data
     *            페이지 데이터
     * @param opt
     *            새창 열기 옵션
     */
    openNewBrowser: function (pageId, data, opt) {
      var url = ih.getTranUrl(pageId);
      var params = ih.util.objectToUrlParams(data);
      url +=
        (url.indexOf("?") >= 0 ? "&" : "?") +
        "_v=" +
        ih.ui.getResourceVersion() +
        (params ? "&" + params : "");
      //url += "&_POPYN=Y";

      if (ih.env.deviceType === "MN" || ih.env.deviceType === "MA") {
        ih.native.openNewBrowser(url, opt);
      } else {
        ih.ui.openWindow(url, "_blank");
      }
    },

    /**
     * 새창열기 (다이렉트 직판 URL 오픈)
     *
     * @param url
     *            전체URL 또는 URL 패스 (URL 패스만 전달한 경우 다이렉트 도메인 추가하여 호출)
     * @param opt
     *            새창 열기 옵션
     */
    openDirectNewBrowser: function (url, data, opt) {
      var url = url.startsWith("http")
        ? url
        : ih.getDirectDomain() + (url.startsWith("/") ? "" : "/") + url;
      var params = ih.util.objectToUrlParams(data);
      url +=
        (url.indexOf("?") >= 0 ? "&" : "?") +
        "_v=" +
        ih.ui.getResourceVersion() +
        (params ? "&" + params : "");

      if (ih.env.deviceType === "MN" || ih.env.deviceType === "MA") {
        ih.native.openNewBrowser(url, opt);
      } else {
        ih.ui.openWindow(url, "IH_WORK_AREA", "_blank");
      }
    },

    /**
     * 새창열기 (아웃링크)
     *
     * 모니모/삼성화재 앱 : 아웃링크 bridge 호출, 그외 window.open
     *
     * @param pageId
     *            페이지 트랜 ID 또는 url 주소
     * @param data
     *            페이지 데이터
     * @param opt
     *            새창 열기 옵션
     */
    openOutBrowser: function (pageId, data, opt) {
      var url = ih.getTranUrl(pageId);
      var params = ih.util.objectToUrlParams(data);
      url +=
        (url.indexOf("?") >= 0 ? "&" : "?") +
        "_v=" +
        ih.ui.getResourceVersion() +
        (params ? "&" + params : "");

      if (ih.env.deviceType === "MN" || ih.env.deviceType === "MA") {
        ih.native.openOutBrowser(url, opt);
      } else {
        var pathname = url.replace("://", "");
        var strIdx = pathname.indexOf("/");
        var endIdx = pathname.indexOf("?");
        pathname =
          strIdx >= 0
            ? pathname.substring(
                strIdx,
                endIdx == -1 ? pathname.length : endIdx
              )
            : "";

        // 앱에서 다운로드를 위해 해당 함수 호출(로그인 필요없는 파일)한 경우 웹에서 새창으로 띄우지 않고 현재창에서 다운로드 되도록 pdf파일 예외처리 추가
        if (
          pathname &&
          !pathname.startsWith("/vh/") &&
          pathname.toLocaleLowerCase().endsWith(".pdf")
        ) {
          ih.debug("현재창에서 다운로드를 진행합니다.");
          location.href = url;
        } else {
          ih.ui.openWindow(url, "IH_WORK_AREA", "_blank");
        }
      }
    },

    /**
     * 새창 닫기
     *
     * 모니모/삼성화재 앱 : 새창닫기 bridge 호출, 그외 window.close
     *
     * @param opt
     *            새창 닫기 옵션
     */
    closeCurBrowser: function (opt) {
      if (ih.env.deviceType === "MN" || ih.env.deviceType === "MA") {
        ih.native.closeCurBrowser(opt);
      } else {
        window.close();
      }
    },

    /**
     * 최상위 페이지 정보
     * 팝업인 경우 팝업페이지 정보, 바닥인경우 바닥페이지 정보
     *
     * @return 최상위 페이지 정보 리턴 {type:'popup'/'page', id:vue바인딩 요소 ID(화면 파일명), tranId: 페이지ID, data:데이터}
     */
    getCurrentPageInfo: function () {
      if (internal._page.modal.length > 0) {
        var page = internal._page.modal[internal._page.modal.length - 1];
        return {
          type: "popup",
          id: internal.getPageId(),
          tranId: page.id,
          data: page.data,
          url: page.url ? page.url.split("?")[0] : undefined,
        };
      } else {
        return {
          type: "page",
          id: internal.getPageId(),
          tranId: ih.getPageId(),
          data: ih.ui.getPageParam(),
          url: location.href.split("?")[0],
        };
      }
    },

    /**
     * 간편모드(고령자 모드) 설정값 조회
     * @return 비동기(Promise)로 결과값 전달 ['Y'/'N']
     */
    getSimpleMode: function () {
      return new Promise(function (resolve, reject) {
        if (ih.env.deviceType === "MN") {
          ih.native.getSimpleMode(function (result) {
            var response = "N";
            if (result && result.data && result.data.simpleModeYn) {
              response = result.data.simpleModeYn;
            }
            resolve(response);
          });
        } else {
          resolve("N");
        }
      });
    },

    /**
     * 새창 열기(window.open)
     * 스마트 링크를 로그 생성 위한 처리 추가
     *
     */
    openWindow: function (url, name, target) {
      //스마트링크 로그 생성을 위해 세션 스토리지에 스마트링크 Flag 가져와 새창 파업 호출시 추가
      var v2SmartLinkVal = sessionStorage.getItem("V2SmartLink"); //true 이거나 없음
      if (v2SmartLinkVal) {
        url +=
          (url.indexOf("?") >= 0 ? "&" : "?") + "V2SmartLink=" + v2SmartLinkVal;
      }

      window.open(url, name, target);
    },

    /**
     * 바이오 인증 호출
     *
     * 위지원 지문인증 솔루션
     * 장기보험계약 바이오서명 (카메라 모듈을 활용한 지문인증)
     *
     * @param data 호출 데이터
     * 			{
     *              [M]signerAge: 서명자 나이
     *			    [M]signerName: 서명자 이름
     *			    [M]defaultFngNum: 디폴트 손가락 번호
     *			    [M]publicKey: 공개키
     * 			}
     * @param callback 결과값을 전달받을 콜백
     * 			{
     * 				-- 오류 발생시 --
     *              code : 에러코드
     *              message : 오류 메시지
     *
     *              -- 정상 처리시 --
     * 				data:
     *			 	{
     *				 	regTemplKeyEncrypt: 등록 암호화 키
     *				 	regTemplHashVal: 등록템플릿해시값
     *				 	regTemplLength: 등록템플릿길이
     *				 	regTempl: 등록템플릿
     *				 	recgTemplKeyEncrypt: 인식 암호화 키
     *				 	recgTemplHashVal: 인식템플릿해시값
     *				 	recgTemplLength: 인식템플릿길이
     *				 	recgTempl: 인식템플릿
     *				 	signTemplKeyEncrypt: 서명 암호화 키
     *				 	signTemplHashVal: 서명템플릿해시값
     *				 	signTemplLength: 서명템플릿길이
     *				 	qsignTempl: 서명템플릿
     *				 	lstShtfngNum: 촬영 손가락 번호
     *				}
     *		  	}
     *
     */
    openBioSign: function (data, callback) {
      if (ih.env.deviceType === "MN" || ih.env.deviceType === "MA") {
        ih.native.fnOpenBioSign(data, callback);
      } else {
        ih.ui.alert("바이오 인증은 앱에서만 지원합니다.");
      }
    },

    /**
     * 긴급 공지 사항이 있는 경우 긴급 공지를 노출한다.
     *
     * @return Promise(result)
     * 					result는 긴급 공지 팝업 오픈 여부 리턴 (true:긴급공지 팝업 오픈됨, false:긴급공지 팝업 오픈안됨)
     */
    openEmergencyNotice: function () {
      var _cId = {
        MN: "MN_E_NOTICE",
        PC: "PC_E_NOTICE",
        MA: "MO_E_NOTICE",
        MW: "MO_E_NOTICE",
      };
      var param = {
        gId: "FRONT_CON",
        cId: _cId[ih.env.deviceType] || "",
      };
      var storageKeyName = "emrgNoti_" + ih.env.deviceType;

      return new Promise(function (resolve, reject) {
        ih.sendRequest("VH.HDFR0030", param).then(function (result) {
          // 2025.02.07 트랜 변경 사항 적용 (VH.HDBZ0020 -> VH.HDFR0030)											//25.02.07 공통코드 -> 메인화면관리 테이블 변경으로 인한 트랜변경 VH.HDBZ0020 - >VH.HDFR0030
          if (
            !ih.util.isEmpty(result) &&
            result.length > 0 &&
            !ih.util.isEmpty(result[0].att1)
          ) {
            ih.util.getLocalStorageItem(storageKeyName, function (ret) {
              if (
                ret &&
                ret.data &&
                ret.data.value !=
                  ih.util.currentDate() + "^" + (result[0].att1 || "")
              ) {
                ih.util.removeLocalStorageItem(storageKeyName);
                ih.ui.modalOpen({
                  pageId: "/v2/html/modal/Z_005_010_004.html",
                  openCallback: function () {
                    var title = ih.util
                      .XSSREValidator(result[0].att1 || "")
                      .replace(
                        /(&lt;)([\/]{0,1})[ \t]*(br|b|h[1-6]{0,1})[ \t]*([\/]{0,1})(&gt;)/gi,
                        "<$2$3$4>"
                      ); // 제목 (허용태그 b, br, h1-h6)
                    var message = ih.util
                      .XSSREValidator(result[0].att2 || "")
                      .replace(
                        /(&lt;)([\/]{0,1})[ \t]*(br|b|h[1-6]{0,1})[ \t]*([\/]{0,1})(&gt;)/gi,
                        "<$2$3$4>"
                      ); // 내용 (허용태그 b, br, h1-h6)
                    var lwrCntnt = ih.util
                      .XSSREValidator(result[0].att4 || "")
                      .replace(
                        /(&lt;)([\/]{0,1})[ \t]*(br|b|h[1-6]{0,1})[ \t]*([\/]{0,1})(&gt;)/gi,
                        "<$2$3$4>"
                      ); // 하단문구 (허용태그 b, br, h1-h6)

                    $(".modal-bottom-sheet .pgr-tit").html(title);
                    $(".modal-bottom-sheet .pop-head .tit-gnb").html(title);
                    $(".modal-bottom-sheet .pop-content .note-txt").html(
                      message
                    );
                    $(".modal-bottom-sheet .pop-content .notify-date").html(
                      lwrCntnt
                    );

                    $(
                      ".modal-bottom-sheet .pop-footer .btn.primary"
                    ).removeClass("fui-modal-close");
                    $(".modal-bottom-sheet .pop-footer .btn.primary")
                      .off("click")
                      .on("click", function () {
                        console.log("자세히 보기");
                        ih.ui.onunload(function () {
                          if (result[0].att3) {
                            ih.ui.openNewBrowser(result[0].att3); // 링크URL
                          }
                        });
                        ih.ui.modalClose();
                      });
                    $(
                      ".modal-bottom-sheet .pop-footer .btn.texted"
                    ).removeClass("fui-modal-close");
                    $(".modal-bottom-sheet .pop-footer .btn.texted")
                      .off("click")
                      .on("click", function () {
                        console.log("오늘 하루 열지 않기");
                        ih.util.setLocalStorageItem(
                          storageKeyName,
                          ih.util.currentDate() + "^" + (result[0].att1 || "")
                        );
                        ih.ui.modalClose();
                      });

                    // 자세히 보기 링크 없는 경우 처리 추가
                    if (ih.util.isEmpty(result[0].att3)) {
                      // 20250124 - 버튼 유지하고 텍스트만 변경하도록 적용 (자세히 보기 -> 확인)
                      $(".modal-bottom-sheet .pop-footer .btn.primary").text(
                        "확인"
                      );
                      //$('.modal-bottom-sheet .pop-footer .btn.primary').hide();
                      //$('.modal-bottom-sheet .pop-footer .btn.texted').removeClass('texted').addClass('secondary');
                    }
                  },
                });

                resolve(true); //긴급 공지 팝업 노출됨
              } else {
                resolve(false); //긴급 공지 팝업 노출 안됨
              }
            });
          } else {
            resolve(false); //긴급 공지 팝업 노출 안됨
          }
        });
      });
    },

    /*-----------------------------------------------------------------*/
    /*                                                                 */
    /*                        Selectbox 관련							   */
    /*                                                                 */
    /*-----------------------------------------------------------------*/

    selectbox: {
      /**
       * selectbox 요소 초기화
       *
       * focus, disabled, set/getValue, getText 함수 제공
       *
       * @param selector : 초기화할 selectbox 쿼리 셀렉터, 생략시 현재 화면에 렌더링된 fui-selectbox 요소 모두 초기화함
       */
      init: function (selector) {
        var focus = function ($selectbox) {
          return function () {
            //console.log($selectbox.find('.ui-select-btn')[0]);
            if ($selectbox.attr("fui-selectbox") !== undefined) {
              $selectbox.find(".ui-select-btn").focus();
            }
          };
        };

        var disabled = function ($selectbox) {
          return function (disabled) {
            if ($selectbox.find("[fui-select]").length > 0) {
              if (disabled) {
                $selectbox.find("[fui-select]").attr("disabled", "disabled");
              } else {
                $selectbox.find("[fui-select]").removeAttr("disabled");
              }
            } else {
              if (disabled) {
                $selectbox.find("select").attr("disabled", "disabled");
              } else {
                $selectbox.find("select").removeAttr("disabled");
              }
            }
          };
        };

        if (selector) {
          var $base = typeof selector === "string" ? $(selector) : selector;
          $base[0].focus = focus($base);
          $base[0].disabled = disabled($base);
        } else {
          $("[fui-selectbox]").each(function (idx, item) {
            //console.log("[" +idx + "] ", item, $(item));
            item.focus = focus($(item));
            item.disabled = disabled($(item));
          });
        }
      },
    },

    /*-----------------------------------------------------------------*/
    /*                                                                 */
    /*           form 관련 처리  (추후  UX 변경사항에 따라 미제공 또는 변경 될 수 있음)   */
    /*                  AS-IS에 지우고 싶은 함수들 모아둠		    		   */
    /*                                                                 */
    /*-----------------------------------------------------------------*/
    form: {
      /**
       * 폼 구성요소 초기화 (form, caption, input, tr, table, datepicker..)
       */
      reset: function () {
        $plugins.page.formResetSync();
      },

      /**
       * 체크박스 체크상태 변경
       *
       * @params id 체크박스ID
       * @params checked 체크상태여부
       */
      check: function (id, checked) {
        if (window._ihPage && "Y" == window._ihPage.oldPageYN) {
          // 이전 모니모 화면인 경우 처리
          $plugins.uiFormCheck({ id: id, checked: checked });
        } else {
          // 신규 모니모 화면인 경우 처리 (원앱 통합)
          $("#" + id)[0].checked = checked;
          MOui.util.trigger($("#" + id)[0], "change");
        }
      },

      /**
       * 약관 동의/비동의 결과 처리
       *
       * @param cls
       *            구분 ( 0 : 전체에 대한 동의, 그외 항목별 동의)
       * @param clkType
       *            클릭 구분 (I : 체크박스 클릭, B : 버튼 클릭)
       * @param retVal
       *            약관 동의 팝업 결과 (X : 닫기, Y : 동의, N : 비동의)
       * @param arrAllItemAgree
       *            체크 ID 리스트
       */
      processAgreeResult: function (cls, clkType, retVal, arrAllItemAgree) {
        var agreeAll = arrAllItemAgree[0];
        var arrAgree = [];
        for (var i = 1; i < arrAllItemAgree.length; i++) {
          arrAgree[i - 1] = arrAllItemAgree[i];
        }

        //전체동의
        if (cls == "0") {
          //닫기버튼을 클릭했을 경우
          if (retVal == "X") {
            this.check(agreeAll, !$("#" + agreeAll).prop("checked"));
          }
          //동의버튼 클릭했을 경우
          else if (retVal == "Y") {
            this.check(agreeAll, true);

            //하위 약관  동의 처리
            for (var i = 0; i < arrAgree.length; i++) {
              this.check(arrAgree[i], true);
            }
          }
          //미동의버튼 클릭했을 경우
          else if (retVal == "N") {
            this.check(agreeAll, false);

            //하위 약관  비동의 처리
            for (var i = 0; i < arrAgree.length; i++) {
              this.check(arrAgree[i], false);
            }
          }
        }
        //항목별 동의
        else {
          var chkAll = true;
          var selAgree = arrAllItemAgree[cls];

          //닫기버튼을 클릭했을 경우
          if (retVal == "X") {
            //checkbox 이벤트(버튼선택시 이벤트 않타도록 해야함. checked값이 변동이 없기 때문)
            if (clkType == "I") {
              this.check(selAgree, !$("#" + selAgree).prop("checked"));
            }
          }
          //동의버튼 클릭했을 경우
          else if (retVal == "Y") {
            this.check(selAgree, true);
          }
          //미동의버튼 클릭했을 경우
          else if (retVal == "N") {
            this.check(selAgree, false);
          }

          for (var i = 0; i < arrAgree.length; i++) {
            if ($("#" + arrAgree[i]).prop("checked") == false) {
              chkAll = false;
              break;
            }
          }

          //전체동의 처리용
          if ($("#" + agreeAll).prop("checked") != chkAll) {
            this.check(agreeAll, chkAll);
          }
        }
      },
    },
  };

  var internal = {
    /**
     * 내부적으로 관리하는 페이지 정보
     */
    _page: {
      stage: null,
      screenId: null,
      pageNumber: null,
      modal: [],
    },

    /**
     * 최상위 페이지 id값(filename) 리턴
     */
    getPageId: function () {
      try {
        if (internal._page.modal.length > 0) {
          //팝업
          var selObj = $(
            "div.base-layer > [id='" +
              internal._page.modal[internal._page.modal.length - 1].id +
              "']"
          );
          if (selObj.length > 0) {
            return internal._page.modal[internal._page.modal.length - 1].id;
          } else {
            selObj = $("div.base-layer > .fui-modal,[fui-modal]");
            if (selObj.length > 0 && selObj[0].id) {
              return selObj[0].id;
            }
          }
          return (
            internal._page.modal[internal._page.modal.length - 1].id ||
            "Unknown"
          );
        } else {
          //메인
          var selObj = $("[vpage]:not('div.base-layer')");
          if (selObj.length > 0) {
            //vpage는 ID존재
            return selObj[0].id;
          } else {
            selObj = $(
              "div.base-wrap,div[data-page-main]:not('div.base-layer')"
            );
            if (selObj.length > 0 && selObj[0].id) {
              return selObj[0].id;
            }
            return "Unknown";
          }
        }
      } catch (e) {
        //ih.debug("페이지 ID를 조회 할 수 없습니다. (ex. 컨텐츠 바텀)");
        return "Unknown";
      }
    },

    /**
     * Url 확장자 리턴
     */
    getUrlExt: function () {
      var result = "",
        url = (location.pathname || location.href).split("?")[0];

      if (url) {
        var exec = /\/.*\.(?<name>[a-zA-Z0-9]*)$/.exec(url);
        result = exec && exec.groups.name ? exec.groups.name : "";
      }
      return result;
    },

    /**
     * 홈화면 인지 여부 리턴
     */
    isHome: function (url) {
      if (!url) {
        url = document.URL;
      }
      var pathname = url.replace("://", "");
      var strIdx = pathname.indexOf("/");
      var endIdx = pathname.indexOf("?");
      pathname =
        strIdx >= 0
          ? pathname.substring(strIdx, endIdx == -1 ? pathname.length : endIdx)
          : "";
      var pageId = "";
      endIdx = pathname.indexOf(".do");
      stIdx = pathname.lastIndexOf("/", endIdx);

      if (endIdx > stIdx) {
        pageId = pathname.substring(stIdx + 1, endIdx);
      }

      ih.debug("[isHome] pathname : " + pathname + ", pageId : " + pageId);

      if (url) {
        var endIdx = url.lastIndexOf(".");
        var stIdx = url.lastIndexOf("/", endIdx);
        if (endIdx > stIdx) {
          pageId = url.substring(stIdx + 1, endIdx);
        }
      }
      switch (ih.env.deviceType) {
        case "PC": // PC인 경우
          if (pathname == "/index.html") {
            return true;
          }
          break;
        case "MA": // 모바일앱인 경우
          if (pathname == "/index.html") {
            return true;
          }
          break;
        case "MW": // 모바일웹인 경우
          if (pathname == "/index.html") {
            return true;
          }
          break;
        case "MN": // 모니모앱인 경우
          if (
            pageId === "VH.IPMN0009" ||
            pageId === "VH.HPMN0002" ||
            pageId === "VH.HPMN0003"
          ) {
            return true;
          }
          break;
        default:
          ih.debug(
            "isHome : 지원되지 않는 디바이스 타입입니다.",
            ih.env.deviceType
          );
          break;
      }

      return false;
    },

    /**
     * 홈화면 URL정보 리턴
     */
    getHomeUrl: function () {
      switch (ih.env.deviceType) {
        case "PC": // PC인 경우
          return "/index.html";
        case "MA": // 모바일앱인 경우
          return "/index.html";
        case "MW": // 모바일웹인 경우
          return "/index.html";
        case "MN": // 모니모앱인 경우
          return "/vh/page/VH.IPMN0009.do";
        default:
          ih.debug(
            "getHomeUrl : 지원되지 않는 디바이스 타입입니다.",
            ih.env.deviceType
          );
          break;
      }

      return "/";
    },

    /**
     * 이전 퍼블에서 모달관련 처리를 위해 ipjs를 호출하는 경우 예외처리 코드 (임시)
     */
    executeAsisCompatibleCode: function () {
      if (!window.ipjs) {
        window.ipjs = {
          uiModalConfirm: function (id, result) {
            ih.debug(
              "모달(" +
                id +
                ") 팝업이 이전 퍼블을 사용하고 있습니다. 수정해 주세요.(ih.ui.modalConfirm)",
              result
            );
            ih.ui.modalConfirm(result);
          },

          uiModalClose: function (id) {
            ih.debug(
              "모달(" +
                id +
                ") 팝업이 이전 퍼블을 사용하고 있습니다. 수정해 주세요.(ih.ui.modalClose)"
            );
            ih.ui.modalClose();
          },
          openDirectNewBrowser: function (url) {
            ih.debug(
              "다이렉트 페이지 오픈시 이전 함수를 호출하고 있습니다. 수정해 주세요.(ih.ui.openDirectNewBrowser)",
              url
            );

            if (
              ih.getStage() === "L" &&
              url.startsWith("https://direct.samsungfire.com")
            ) {
              url = ih.getDirectDomain(
                url.substring("https://direct.samsungfire.com".length)
              );
            }

            ih.ui.openDirectNewBrowser(url);
          },
        };
      }
    },
  };

  self.load();
  return self;
})();

/******************************************************************************************
 *
 * 브라우저 호환 코드
 *
 ******************************************************************************************/

// replaceAll
if (typeof String.prototype.replaceAll !== "function") {
  String.prototype.replaceAll = function (match, replace) {
    if (match && typeof match == "string") {
      return this.split(match).join(replace);
    } else {
      return this.replace(new RegExp(match, "g"), function () {
        return replace;
      });
    }
  };
}
// startsWith
if (typeof String.prototype.startsWith != "function") {
  String.prototype.startsWith = function (str) {
    if (this.length < str.length) {
      return false;
    }
    return this.indexOf(str) == 0;
  };
}
// endsWith
if (typeof String.prototype.endsWith != "function") {
  String.prototype.endsWith = function (str) {
    if (this.length < str.length) {
      return false;
    }
    return this.lastIndexOf(str) + str.length == this.length;
  };
}
// Object.assign
if (typeof Object.assign != "function") {
  Object.defineProperty(Object, "assign", {
    value: function assign(target, varArgs) {
      if (target == null) {
        throw new TypeError("Cannot convert undefined or null to object");
      }
      var to = Object(target);
      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];
        if (nextSource != null) {
          for (var nextKey in nextSource) {
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    },
    writable: true,
    configurable: true,
  });
}

!(function (s) {
  s("head")
    .append(
      '<script src="/v2/resources/js/ui.front.js?_ver=' +
        Date.now() +
        '"></script>'
    )
    .append(
      '<script src="/v2/resources/js/ui.init.js?_ver=' +
        Date.now() +
        '"></script>'
    )
    .append(
      '<script src="/v2/resources/js/ui.plugins.js?_ver=' +
        Date.now() +
        '"></script>'
    )
    .append(
      '<script src="/v2/resources/js/ui.menu.js?_ver=' +
        Date.now() +
        '"></script>'
    )
    .append(
      '<script src="/v2/resources/js/ui.common.js?_ver=' +
        Date.now() +
        '"></script>'
    )
    .append(
      '<script src="/v2/resources/js/lottie_light.min.js?_ver=' +
        Date.now() +
        '"></script>'
    );
})(jQuery, (window, document));
