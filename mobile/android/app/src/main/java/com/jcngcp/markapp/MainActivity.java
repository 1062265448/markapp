package com.jcngcp.markapp;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // 确保状态栏和导航栏不覆盖 WebView 内容区域
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }
}
