package com.vex.livemobile;
import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.webkit.*;
import android.view.*;
import android.graphics.Color;

public class MainActivity extends Activity {
 private WebView web;
 private ValueCallback<Uri[]> picker;
 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
  getWindow().setStatusBarColor(Color.rgb(14,12,24));
  getWindow().setNavigationBarColor(Color.rgb(14,12,24));
  web=new WebView(this); web.setBackgroundColor(Color.rgb(14,12,24));
  WebSettings s=web.getSettings(); s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true);
  s.setAllowFileAccess(false); s.setAllowContentAccess(true); s.setAllowFileAccessFromFileURLs(false); s.setAllowUniversalAccessFromFileURLs(false);
  s.setMediaPlaybackRequiresUserGesture(true);
  web.setWebViewClient(new WebViewClient(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest req) {
    Uri u=req.getUrl();
    if("app.vex.local".equals(u.getHost()) && "https".equals(u.getScheme())){
     String p=u.getPath(); if(p==null || p.contains("..")) return null;
     try { String mime=p.endsWith(".js")?"application/javascript":p.endsWith(".css")?"text/css":"text/html";
      return new WebResourceResponse(mime,"UTF-8",getAssets().open(p.substring(1)));
     } catch(Exception e){ return new WebResourceResponse("text/plain","UTF-8",new java.io.ByteArrayInputStream(new byte[0])); }
    } return null;
   }
   @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r){return true;}
  });
  web.setWebChromeClient(new WebChromeClient(){
   @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> cb,FileChooserParams params){
    if(picker!=null) picker.onReceiveValue(null); picker=cb;
    try { Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT); i.setType("audio/*"); i.addCategory(Intent.CATEGORY_OPENABLE); startActivityForResult(i,42); return true; }
    catch(Exception ex){picker.onReceiveValue(null);picker=null;return false;}
   }
  });
  web.addJavascriptInterface(new Object(){
   @JavascriptInterface public void orientation(boolean wide){runOnUiThread(()->setRequestedOrientation(wide?ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE:ActivityInfo.SCREEN_ORIENTATION_PORTRAIT));}
   @JavascriptInterface public void immersive(boolean full){runOnUiThread(()->getWindow().getDecorView().setSystemUiVisibility(full?5894:0));}
  },"Native");
  setContentView(web); web.loadUrl("https://app.vex.local/index.html");
 }
 @Override protected void onActivityResult(int r,int c,Intent d){super.onActivityResult(r,c,d);if(r==42&&picker!=null){picker.onReceiveValue(c==RESULT_OK&&d!=null&&d.getData()!=null?new Uri[]{d.getData()}:null);picker=null;}}
 @Override public void onBackPressed(){web.evaluateJavascript("window.exitStage && window.exitStage()",null);}
 @Override protected void onDestroy(){if(picker!=null)picker.onReceiveValue(null);web.destroy();super.onDestroy();}
}
