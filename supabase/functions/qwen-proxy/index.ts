// deno-lint-ignore-file no-explicit-any
// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    // 解析请求体
    const { messages, apiKey } = await req.json();
    
    // 验证API密钥
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          error: {
            code: 'MISSING_API_KEY',
            message: 'API密钥缺失，请在请求体中提供apiKey字段'
          }
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          }, 
          status: 400 
        }
      );
    }

    // 验证消息格式
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ 
          error: {
            code: 'INVALID_MESSAGES',
            message: '消息格式无效，messages应为数组格式'
          }
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          }, 
          status: 400 
        }
      );
    }

    // 调用通义千问API
    const qwenResponse = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-DashScope-SSE': 'disable'
      },
      body: JSON.stringify({ 
        model: 'qwen-turbo', 
        input: { 
          messages: messages
        }, 
        parameters: { 
          temperature: 0.7,
          incremental_output: false
        } 
      }),
    });

    // 获取响应内容
    const qwenData = await qwenResponse.json();
    
    // 如果调用失败，返回详细错误信息
    if (!qwenResponse.ok) {
      console.error('通义千问API调用失败:', {
        status: qwenResponse.status,
        statusText: qwenResponse.statusText,
        responseData: qwenData
      });
      
      // 特别处理401错误，提供更多有用信息
      if (qwenResponse.status === 401) {
        return new Response(
          JSON.stringify({
            error: {
              code: 'UNAUTHORIZED',
              message: 'API密钥验证失败，请检查您的API Key是否正确且有效',
              detail: {
                status: qwenResponse.status,
                statusText: qwenResponse.statusText,
                suggestion: '请确认您已在阿里云百炼平台获取了有效的API Key，并确保该Key具有访问通义千问服务的权限'
              }
            }
          }),
          {
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            }, 
            status: 401
          }
        );
      }
      
      return new Response(
        JSON.stringify({
          error: {
            code: qwenData.code || 'QWEN_API_ERROR',
            message: qwenData.message || '调用通义千问API失败',
            detail: {
              status: qwenResponse.status,
              statusText: qwenResponse.statusText,
              responseData: qwenData
            }
          }
        }),
        {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          }, 
          status: qwenResponse.status
        }
      );
    }
    
    // 成功响应
    return new Response(
      JSON.stringify(qwenData), 
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 200 
      }
    );
  } catch (error) {
    // 处理意外错误
    console.error('qwen-proxy函数发生错误:', error);
    
    return new Response(
      JSON.stringify({ 
        error: {
          code: 'INTERNAL_ERROR',
          message: '函数执行过程中发生错误',
          detail: error.message || '未知错误'
        }
      }), 
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 500 
      }
    );
  }
});